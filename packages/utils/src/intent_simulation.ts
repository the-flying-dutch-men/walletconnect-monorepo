/**
 * Transaction Simulation Engine for WC-WE (WalletConnect - Waist Envelope)
 *
 * Simulates transaction execution using eth_call and debug_traceCall to extract
 * state changes (token transfers) and verify they match the typed intent.
 *
 * @see White Paper - Transaction Simulation for Blind Signing Prevention
 */

import { IntentTypes, SimulationTypes } from "@walletconnect/types";
import { isValidObject } from "./validators.js";

// ERC20 Transfer event signature hash
const TRANSFER_EVENT_SIGNATURE =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// Cache for token info to avoid repeated calls
const tokenInfoCache: Map<string, SimulationTypes.TokenInfo> = new Map();

/**
 * Format raw amount with decimals to human readable string
 */
function formatUnits(value: string, decimals: number): string {
  const val = BigInt(value);
  const divisor = BigInt(10 ** decimals);
  const integer = val / divisor;
  const fraction = val % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0");
  // Trim trailing zeros after decimal
  const trimmedFraction = fractionStr.replace(/0+$/, "");
  return trimmedFraction ? `${integer}.${trimmedFraction}` : integer.toString();
}

/**
 * Parse raw amount from hex or decimal string
 */
function parseAmount(value: string): string {
  if (value.startsWith("0x")) {
    return BigInt(value).toString();
  }
  return value;
}

/**
 * Get token info (symbol, decimals) from contract
 */
async function getTokenInfo(
  tokenAddress: string,
  provider: any,
): Promise<SimulationTypes.TokenInfo> {
  const cacheKey = tokenAddress.toLowerCase();
  if (tokenInfoCache.has(cacheKey)) {
    return tokenInfoCache.get(cacheKey)!;
  }

  try {
    // ERC20 symbol() selector: 0x95d89b41
    const symbolData = "0x95d89b41";
    const symbolResult = await provider.call({
      to: tokenAddress,
      data: symbolData,
    });

    // ERC20 decimals() selector: 0x313ce567
    const decimalsData = "0x313ce567";
    const decimalsResult = await provider.call({
      to: tokenAddress,
      data: decimalsData,
    });

    // Decode results (strip 0x prefix and padding)
    const symbol = decodeStringResponse(symbolResult) || "UNKNOWN";
    const decimals = parseInt(decimalsResult, 16) || 18;

    const info: SimulationTypes.TokenInfo = {
      address: tokenAddress,
      symbol,
      decimals,
    };

    tokenInfoCache.set(cacheKey, info);
    return info;
  } catch {
    // Fallback for unknown tokens
    const fallback: SimulationTypes.TokenInfo = {
      address: tokenAddress,
      symbol: "UNKNOWN",
      decimals: 18,
    };
    tokenInfoCache.set(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Decode string response from contract call
 */
function decodeStringResponse(hexResponse: string): string | null {
  if (!hexResponse || hexResponse === "0x") return null;

  try {
    // Remove 0x prefix
    const hex = hexResponse.slice(2);
    // First 64 chars (32 bytes) is offset, next 64 chars is length
    const lengthHex = hex.slice(64, 128);
    const length = parseInt(lengthHex, 16);

    if (length === 0 || length > 100) return null;

    // String data starts at byte 64 (128 hex chars)
    const dataStart = 128;
    const dataHex = hex.slice(dataStart, dataStart + length * 2);

    // Convert hex to string
    let str = "";
    for (let i = 0; i < dataHex.length; i += 2) {
      const charCode = parseInt(dataHex.slice(i, i + 2), 16);
      if (charCode === 0) break;
      str += String.fromCharCode(charCode);
    }

    return str;
  } catch {
    return null;
  }
}

/**
 * Parse ERC20 Transfer events from trace logs
 */
async function parseERC20Transfers(
  trace: any,
  _userAddress: string,
  provider: any,
): Promise<SimulationTypes.ERC20TransferEvent[]> {
  const transfers: SimulationTypes.ERC20TransferEvent[] = [];

  if (!trace || !trace.logs || !Array.isArray(trace.logs)) {
    return transfers;
  }

  for (const log of trace.logs) {
    // Check if this is a Transfer event
    if (log.topics && log.topics[0] === TRANSFER_EVENT_SIGNATURE) {
      try {
        const from = "0x" + log.topics[1].slice(26);
        const to = "0x" + log.topics[2].slice(26);
        const amount = parseAmount(log.data);

        // Get token info
        const tokenInfo = await getTokenInfo(log.address, provider);

        const transfer: SimulationTypes.ERC20TransferEvent = {
          tokenAddress: log.address,
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          amount,
          formattedAmount: formatUnits(amount, tokenInfo.decimals),
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
        };

        transfers.push(transfer);
      } catch (error) {
        console.warn("Failed to parse transfer event:", error);
      }
    }
  }

  return transfers;
}

/**
 * Execute eth_call to check for reverts and basic execution
 */
async function executeEthCall(
  input: SimulationTypes.SimulationInput,
  provider: any,
  blockTag?: string | number,
): Promise<{ success: boolean; revertReason?: string; returnData?: string }> {
  try {
    const callParams = {
      from: input.from,
      to: input.to,
      data: input.data || "0x",
      value: input.value || "0x0",
    };

    const result = await provider.call(callParams, blockTag || "latest");

    return {
      success: true,
      returnData: result,
    };
  } catch (error: any) {
    // Extract revert reason from error
    let revertReason = "Transaction will revert";

    if (error.reason) {
      revertReason = error.reason;
    } else if (error.message) {
      // Try to parse common revert patterns
      const revertMatch = error.message.match(/reverted:?(.*)/i);
      if (revertMatch) {
        revertReason = revertMatch[1].trim();
      } else if (error.message.includes("execution reverted")) {
        revertReason = "Execution reverted";
      }
    }

    return {
      success: false,
      revertReason,
    };
  }
}

/**
 * Execute debug_traceCall to get detailed trace
 */
async function executeTraceCall(
  input: SimulationTypes.SimulationInput,
  provider: any,
  blockTag?: string | number,
): Promise<{ success: boolean; trace?: any; error?: string }> {
  try {
    const txParams = {
      from: input.from,
      to: input.to,
      data: input.data || "0x",
      value: input.value || "0x0",
      gas: input.gasLimit,
    };

    const tracerOptions = {
      tracer: "callTracer",
      tracerConfig: {
        withLog: true,
        onlyTopCall: false,
      },
    };

    const trace = await provider.send("debug_traceCall", [
      txParams,
      blockTag || "latest",
      tracerOptions,
    ]);

    return {
      success: true,
      trace,
    };
  } catch (error: any) {
    // Check if method is not supported
    if (
      error.message?.includes("method not found") ||
      error.message?.includes("unsupported method") ||
      error.code === -32601
    ) {
      return {
        success: false,
        error: "TRACE_UNSUPPORTED",
      };
    }

    return {
      success: false,
      error: error.message || "Trace failed",
    };
  }
}

/**
 * Get gas estimate for transaction
 */
async function estimateGas(input: SimulationTypes.SimulationInput, provider: any): Promise<string> {
  try {
    const estimate = await provider.estimateGas({
      from: input.from,
      to: input.to,
      data: input.data,
      value: input.value || "0x0",
    });

    // Add 20% buffer for safety
    const withBuffer = (BigInt(estimate) * BigInt(120)) / BigInt(100);
    return withBuffer.toString();
  } catch {
    return "0";
  }
}

/**
 * Build asset changes from transfers and native value
 */
async function buildAssetChanges(
  transfers: SimulationTypes.ERC20TransferEvent[],
  input: SimulationTypes.SimulationInput,
): Promise<{
  inputChanges: SimulationTypes.AssetChange[];
  outputChanges: SimulationTypes.AssetChange[];
}> {
  const inputChanges: SimulationTypes.AssetChange[] = [];
  const outputChanges: SimulationTypes.AssetChange[] = [];
  const userLower = input.from.toLowerCase();

  // Handle native ETH transfer
  if (input.value && BigInt(input.value) > 0) {
    const ethAmount = formatUnits(input.value, 18);
    const change: SimulationTypes.AssetChange = {
      assetType: "native",
      symbol: "ETH",
      amount: ethAmount,
      rawAmount: input.value,
      direction: "out",
      verified: false, // Will be verified against intent
    };
    inputChanges.push(change);
  }

  // Process ERC20 transfers
  for (const transfer of transfers) {
    const isOutgoing = transfer.from === userLower;
    const isIncoming = transfer.to === userLower;

    if (!isOutgoing && !isIncoming) {
      continue; // Transfer doesn't involve user
    }

    const change: SimulationTypes.AssetChange = {
      assetType: "erc20",
      address: transfer.tokenAddress,
      symbol: transfer.symbol || "UNKNOWN",
      amount: transfer.formattedAmount || transfer.amount,
      rawAmount: transfer.amount,
      direction: isOutgoing ? "out" : "in",
      verified: false,
    };

    if (isOutgoing) {
      inputChanges.push(change);
    } else {
      outputChanges.push(change);
    }
  }

  return { inputChanges, outputChanges };
}

/**
 * Compare asset changes against intent
 */
function verifyAgainstIntent(
  inputChanges: SimulationTypes.AssetChange[],
  outputChanges: SimulationTypes.AssetChange[],
  intent: IntentTypes.Intent,
): { matches: boolean; details: string[] } {
  const details: string[] = [];
  let matches = true;

  switch (intent.type) {
    case "Swap": {
      const swapParams = intent.params as IntentTypes.SwapParams;
      const expectedInSymbol = swapParams.asset_in.symbol;
      const expectedInAmount = swapParams.amount_in;
      const expectedOutSymbol = swapParams.asset_out.symbol;
      const expectedOutMin = swapParams.min_out;

      // Verify input
      const inputMatch = inputChanges.find(
        (c) =>
          c.symbol.toLowerCase() === expectedInSymbol.toLowerCase() ||
          (c.address?.toLowerCase() === swapParams.asset_in.address.toLowerCase() &&
            c.direction === "out"),
      );

      if (inputMatch) {
        inputMatch.verified = true;
        inputMatch.verificationNote = "Matches intent input";
      } else if (inputChanges.length === 0) {
        details.push(
          `Expected to send ${expectedInAmount} ${expectedInSymbol} but simulation shows no outgoing tokens`,
        );
        matches = false;
      }

      // Verify output
      const outputMatch = outputChanges.find(
        (c) =>
          c.symbol.toLowerCase() === expectedOutSymbol.toLowerCase() ||
          (c.address?.toLowerCase() === swapParams.asset_out.address.toLowerCase() &&
            c.direction === "in"),
      );

      if (outputMatch) {
        outputMatch.verified = true;
        outputMatch.verificationNote = "Matches intent output";
      } else if (outputChanges.length === 0) {
        details.push(
          `Expected to receive at least ${expectedOutMin} ${expectedOutSymbol} but simulation shows no incoming tokens`,
        );
        matches = false;
      }

      break;
    }

    case "Transfer": {
      const transferParams = intent.params as IntentTypes.TransferParams;
      const expectedSymbol = transferParams.asset.symbol;
      const expectedAmount = transferParams.amount;
      const expectedRecipient = transferParams.recipient.toLowerCase();

      // Find transfer to expected recipient
      const transferOut = inputChanges.find(
        (c) =>
          c.direction === "out" &&
          (c.symbol.toLowerCase() === expectedSymbol.toLowerCase() ||
            c.address?.toLowerCase() === transferParams.asset.address.toLowerCase()),
      );

      if (transferOut) {
        transferOut.verified = true;
        transferOut.verificationNote = `Transfer to ${expectedRecipient.slice(
          0,
          6,
        )}...${expectedRecipient.slice(-4)}`;
      } else {
        details.push(
          `Expected to transfer ${expectedAmount} ${expectedSymbol} but simulation shows no such transfer`,
        );
        matches = false;
      }

      break;
    }

    case "Approve":
    case "Permit2": {
      // For approvals, we just verify a token interaction occurred
      const hasTokenInteraction =
        inputChanges.some((c) => c.assetType === "erc20") ||
        outputChanges.some((c) => c.assetType === "erc20");

      if (hasTokenInteraction) {
        inputChanges.forEach((c) => {
          if (c.assetType === "erc20") {
            c.verified = true;
            c.verificationNote = "Token approval interaction";
          }
        });
      }

      break;
    }

    default: {
      // For unknown types, mark all as unverified
      details.push(`Intent type "${intent.type}" not fully supported for simulation verification`);
      matches = false;
    }
  }

  return { matches, details };
}

/**
 * Main simulation function
 * Simulates a transaction and verifies it matches the typed intent
 */
export async function simulateIntent(
  input: SimulationTypes.SimulationInput,
  intent: IntentTypes.Intent,
  config: SimulationTypes.SimulationConfig,
): Promise<SimulationTypes.SimulationResult> {
  const provider = config.provider;
  const blockTag = config.blockTag;
  const warnings: string[] = [];

  // Validate inputs
  if (!isValidObject(input)) {
    throw new Error("Invalid simulation input");
  }
  if (!isValidObject(intent)) {
    throw new Error("Invalid intent");
  }
  if (!provider) {
    throw new Error("Provider is required");
  }

  // Step 1: Execute eth_call to check for reverts
  const ethCallResult = await executeEthCall(input, provider, blockTag);

  if (!ethCallResult.success) {
    return {
      status: "revert",
      inputChanges: [],
      outputChanges: [],
      gasEstimate: "0",
      warnings: [`Transaction will revert: ${ethCallResult.revertReason}`],
      revertReason: ethCallResult.revertReason,
      matchesIntent: false,
      usedTrace: false,
    };
  }

  // Step 2: Try to get detailed trace
  const traceResult = await executeTraceCall(input, provider, blockTag);
  let transfers: SimulationTypes.ERC20TransferEvent[] = [];
  let usedTrace = false;

  if (traceResult.success && traceResult.trace) {
    transfers = await parseERC20Transfers(traceResult.trace, input.from, provider);
    usedTrace = true;
  } else if (traceResult.error === "TRACE_UNSUPPORTED") {
    warnings.push("Detailed simulation unavailable on this network. Showing limited preview.");
  }

  // Step 3: Build asset changes
  const { inputChanges, outputChanges } = await buildAssetChanges(transfers, input);

  // Step 4: Get gas estimate
  const gasEstimate = await estimateGas(input, provider);

  // Step 5: Verify against intent
  const verification = verifyAgainstIntent(inputChanges, outputChanges, intent);

  // Determine status
  let status: SimulationTypes.SimulationResult["status"] = "success";
  if (!usedTrace && inputChanges.length === 0 && outputChanges.length === 0) {
    status = "partial";
  }

  // Add mismatch warnings
  if (!verification.matches) {
    warnings.push(...verification.details);
  }

  return {
    status,
    inputChanges,
    outputChanges,
    gasEstimate,
    warnings,
    matchesIntent: verification.matches,
    mismatchDetails: verification.details,
    usedTrace,
  };
}

/**
 * Simulate a transaction without intent verification
 * Useful for previewing arbitrary transactions
 */
export async function simulateTransaction(
  input: SimulationTypes.SimulationInput,
  config: SimulationTypes.SimulationConfig,
): Promise<
  Omit<SimulationTypes.SimulationResult, "matchesIntent" | "mismatchDetails"> & { success: boolean }
> {
  const result = await simulateIntent(
    input,
    {
      type: "Custom",
      params: { message_schema_id: "raw", message_fields_hash: "" },
      human_template_id: "raw",
      human_text: "Raw transaction",
    } as IntentTypes.Intent,
    config,
  );

  return {
    ...result,
    success: result.status !== "revert" && result.status !== "error",
  };
}

/**
 * Clear token info cache
 * Useful for testing or when token metadata changes
 */
export function clearTokenCache(): void {
  tokenInfoCache.clear();
}

/**
 * Check if a provider supports debug_traceCall
 */
export async function supportsTraceCall(provider: any): Promise<boolean> {
  try {
    await provider.send("debug_traceCall", [
      { from: "0x0", to: "0x0", value: "0x0" },
      "latest",
      { tracer: "callTracer" },
    ]);
    return true;
  } catch (error: any) {
    if (
      error.message?.includes("method not found") ||
      error.message?.includes("unsupported method") ||
      error.code === -32601
    ) {
      return false;
    }
    // Other errors might mean it's supported but call failed
    return true;
  }
}

export { formatUnits, parseAmount, TRANSFER_EVENT_SIGNATURE };
