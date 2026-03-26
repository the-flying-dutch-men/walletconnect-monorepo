/**
 * Type definitions for transaction simulation and intent verification
 * within the WalletConnect SDK.
 *
 * This module defines input/output structures used by the simulator
 * to validate a proposed transaction against a given intent.
 */

export declare namespace SimulationTypes {
  /**
   * Input parameters for transaction simulation
   */
  interface SimulationInput {
    /** User address initiating the transaction */
    from: string;
    /** Contract address or recipient */
    to: string;
    /** Calldata for the transaction (optional) */
    data?: string;
    /** Value in wei for the transaction (optional) */
    value?: string;
    /** Gas limit for the transaction (optional) */
    gasLimit?: string;
    /** Target network chain identifier (as string) */
    chainId: string;
  }

  /**
   * Configuration for simulation execution
   */
  interface SimulationConfig {
    /** Ethers.js JsonRpcProvider instance */
    provider: any;
    /** Block tag for simulation (default: 'latest') */
    blockTag?: string | number;
  }

  /**
   * ERC20 Transfer event extracted from trace logs
   */
  interface ERC20TransferEvent {
    /** Token contract address */
    tokenAddress: string;
    /** Sender address */
    from: string;
    /** Recipient address */
    to: string;
    /** Raw amount (wei/units) */
    amount: string;
    /** Formatted amount (human readable) */
    formattedAmount?: string;
    /** Token symbol */
    symbol?: string;
    /** Token decimals */
    decimals?: number;
  }

  /**
   * Asset change (input or output) from simulation
   */
  interface AssetChange {
    /** Asset type */
    assetType: "native" | "erc20";
    /** Token contract address (for ERC20) */
    address?: string;
    /** Token symbol (ETH, USDC, etc.) */
    symbol: string;
    /** Human readable amount */
    amount: string;
    /** Raw amount */
    rawAmount?: string;
    /** Direction of flow */
    direction: "in" | "out";
    /** Whether this change matches the intent */
    verified: boolean;
    /** Verification details */
    verificationNote?: string;
  }

  /**
   * Result of transaction simulation
   */
  interface SimulationResult {
    /** Simulation status */
    status: "success" | "revert" | "partial" | "error";
    /** Assets the user will give/send */
    inputChanges: AssetChange[];
    /** Assets the user will receive */
    outputChanges: AssetChange[];
    /** Estimated gas used */
    gasEstimate: string;
    /** Gas price (if available) */
    gasPrice?: string;
    /** Total gas cost in native token */
    gasCost?: string;
    /** Warnings to display to user */
    warnings: string[];
    /** Revert reason (if status is 'revert') */
    revertReason?: string;
    /** Whether simulation matches intent */
    matchesIntent: boolean;
    /** Details about mismatches */
    mismatchDetails?: string[];
    /** Whether debug_traceCall was used */
    usedTrace: boolean;
    /** Block number used for simulation */
    blockNumber?: number;
  }

  /**
   * Token information cache entry
   */
  interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    name?: string;
  }

  /**
   * Simulation error types
   */
  type SimulationErrorCode =
    | "REVERT"
    | "INSUFFICIENT_FUNDS"
    | "GAS_LIMIT_EXCEEDED"
    | "TRACE_UNSUPPORTED"
    | "NETWORK_ERROR"
    | "PARSE_ERROR"
    | "UNKNOWN";

  /**
   * Simulation error
   */
  interface SimulationError {
    code: SimulationErrorCode;
    message: string;
    recoverable: boolean;
  }

  /**
   * Intent verification result
   */
  interface IntentVerification {
    /** Whether inputs match intent */
    inputsMatch: boolean;
    /** Whether outputs match intent */
    outputsMatch: boolean;
    /** Whether recipient matches */
    recipientMatch: boolean;
    /** Detailed verification results */
    details: {
      expectedInput?: AssetChange;
      actualInput?: AssetChange;
      expectedOutput?: AssetChange;
      actualOutput?: AssetChange;
    };
  }
}
