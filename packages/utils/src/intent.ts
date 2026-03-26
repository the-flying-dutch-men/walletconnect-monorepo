import { IntentTypes } from "@walletconnect/types";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { isValidObject, isValidString } from "./validators.js";

export const INTENT_VERSION = "1.0.0";

export const INTENT_TYPES: IntentTypes.IntentType[] = [
  "Swap",
  "Transfer",
  "Approve",
  "Permit2",
  "Mint",
  "Stake",
  "Unstake",
  "Borrow",
  "Repay",
  "Bridge",
  "Vote",
  "SignData",
  "Custom",
];

export function isValidIntentType(type: any): boolean {
  return INTENT_TYPES.includes(type);
}

export function isValidAsset(asset: any): boolean {
  if (!asset || typeof asset !== "object") return false;
  if (!isValidString(asset.chain, false)) return false;
  if (!isValidString(asset.symbol, false)) return false;
  if (!isValidString(asset.address, false)) return false;
  return typeof asset.decimals === "number";
}

export function isValidSwapParams(params: any): boolean {
  if (!params || typeof params !== "object") return false;
  if (!isValidAsset(params.asset_in)) return false;
  if (!isValidString(params.amount_in, false)) return false;
  if (!isValidAsset(params.asset_out)) return false;
  if (!isValidString(params.min_out, false)) return false;
  if (typeof params.deadline_unix_ms !== "number") return false;
  if (typeof params.fee_cap_bps !== "number") return false;
  return isValidString(params.recipient, false);
}

export function isValidTransferParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidAsset(params.asset)) return false;
  if (!isValidString(params.amount, false)) return false;
  if (!isValidString(params.recipient, false)) return false;
  return typeof params.deadline_unix_ms === "number";
}

export function isValidApproveParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidAsset(params.asset)) return false;
  if (!isValidString(params.spender, false)) return false;
  if (!isValidString(params.allowance_max, false)) return false;
  return typeof params.expiry_unix_ms === "number";
}

export function isValidPermit2Params(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidAsset(params.asset)) return false;
  if (!isValidString(params.spender, false)) return false;
  if (!isValidString(params.amount_max, false)) return false;
  if (!isValidString(params.nonce, false)) return false;
  return typeof params.expiry_unix_ms === "number";
}

export function isValidMintParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidString(params.collection, false)) return false;
  if (typeof params.quantity !== "number") return false;
  if (!isValidString(params.price_total, false)) return false;
  if (typeof params.deadline_unix_ms !== "number") return false;
  return isValidString(params.recipient, false);
}

export function isValidStakeParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidAsset(params.asset)) return false;
  if (!isValidString(params.amount, false)) return false;
  return isValidString(params.pool_id, false);
}

export function isValidUnstakeParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidAsset(params.asset)) return false;
  if (!isValidString(params.amount, false)) return false;
  return isValidString(params.pool_id, false);
}

export function isValidBorrowParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidAsset(params.asset)) return false;
  if (!isValidString(params.amount, false)) return false;
  if (!isValidString(params.collateral_limit, false)) return false;
  if (typeof params.ltv_liquidation !== "number") return false;
  if (typeof params.rate_cap_bps !== "number") return false;
  return typeof params.deadline_unix_ms === "number";
}

export function isValidRepayParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidAsset(params.asset)) return false;
  if (!isValidString(params.amount, false)) return false;
  if (!isValidString(params.loan_id, false)) return false;
  return typeof params.deadline_unix_ms === "number";
}

export function isValidBridgeParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidAsset(params.asset)) return false;
  if (!isValidString(params.amount, false)) return false;
  if (!isValidString(params.dst_chain, false)) return false;
  if (!isValidString(params.recipient, false)) return false;
  if (typeof params.fee_cap_bps !== "number") return false;
  return typeof params.deadline_unix_ms === "number";
}

export function isValidVoteParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidString(params.proposal_id, false)) return false;
  if (!isValidString(params.option, false)) return false;
  if (typeof params.snapshot_block !== "number") return false;
  return typeof params.deadline_unix_ms === "number";
}

export function isValidSignDataParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidObject(params.eip712_domain)) return false;
  if (!isValidString(params.message_schema_id, false)) return false;
  if (!isValidString(params.message_fields_hash, false)) return false;
  if (!isValidString(params.purpose, false)) return false;
  return true;
}

export function isValidCustomParams(params: any): boolean {
  if (!isValidObject(params)) return false;
  if (!isValidString(params.message_schema_id, false)) return false;
  if (!isValidString(params.message_fields_hash, false)) return false;
  return true;
}

export function isValidIntentParams(type: IntentTypes.IntentType, params: any): boolean {
  switch (type) {
    case "Swap":
      return isValidSwapParams(params);
    case "Transfer":
      return isValidTransferParams(params);
    case "Approve":
      return isValidApproveParams(params);
    case "Permit2":
      return isValidPermit2Params(params);
    case "Mint":
      return isValidMintParams(params);
    case "Stake":
      return isValidStakeParams(params);
    case "Unstake":
      return isValidUnstakeParams(params);
    case "Borrow":
      return isValidBorrowParams(params);
    case "Repay":
      return isValidRepayParams(params);
    case "Bridge":
      return isValidBridgeParams(params);
    case "Vote":
      return isValidVoteParams(params);
    case "SignData":
      return isValidSignDataParams(params);
    case "Custom":
      return isValidCustomParams(params);
    default:
      return false;
  }
}

export function isValidIntent(intent: any): intent is IntentTypes.Intent {
  if (!isValidObject(intent)) return false;
  if (!isValidIntentType(intent.type)) return false;
  if (!isValidIntentParams(intent.type, intent.params)) return false;
  if (!isValidString(intent.human_template_id, false)) return false;
  if (!isValidString(intent.human_text, false)) return false;
  return true;
}

export function serializeCanonicalParams(params: IntentTypes.IntentParams): string {
  const sortedKeys = Object.keys(params).sort();
  const sortedParams: Record<string, any> = {};
  for (const key of sortedKeys) {
    const value = (params as any)[key];
    if (isValidObject(value) && !Array.isArray(value)) {
      sortedParams[key] = JSON.parse(serializeCanonicalParams(value));
    } else if (Array.isArray(value)) {
      sortedParams[key] = value.map((item) =>
        isValidObject(item) && !Array.isArray(item)
          ? JSON.parse(serializeCanonicalParams(item))
          : item,
      );
    } else {
      sortedParams[key] = value;
    }
  }
  return JSON.stringify(sortedParams);
}

export function computeIntentHash(
  type: IntentTypes.IntentType,
  params: IntentTypes.IntentParams,
  templateId: string,
  locale: string,
): string {
  const serializedParams = serializeCanonicalParams(params);
  const data = JSON.stringify({
    type,
    params: serializedParams,
    template_id: templateId,
    locale,
  });
  const hash = sha256(new TextEncoder().encode(data));
  return "sha256:" + bytesToHex(hash);
}

export function renderHumanText(
  type: IntentTypes.IntentType,
  params: IntentTypes.IntentParams,
  locale: string,
): string {
  const dateOpts: Intl.DateTimeFormatOptions =
    locale === "UTC"
      ? { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }
      : { hour: "2-digit", minute: "2-digit" };
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString(locale, dateOpts);

  switch (type) {
    case "Swap": {
      const p = params as IntentTypes.SwapParams;
      return `Swap ${p.amount_in} ${p.asset_in.symbol} for at least ${p.min_out} ${p.asset_out.symbol} before ${fmtTime(p.deadline_unix_ms)} with max fee ${(p.fee_cap_bps / 100).toFixed(2)}%.`;
    }
    case "Transfer": {
      const p = params as IntentTypes.TransferParams;
      const shortAddr = p.recipient.slice(0, 6) + "…" + p.recipient.slice(-4);
      return `Send ${p.amount} ${p.asset.symbol} to ${shortAddr} before ${fmtTime(p.deadline_unix_ms)}.`;
    }
    case "Approve": {
      const p = params as IntentTypes.ApproveParams;
      const shortSpender = p.spender.slice(0, 6) + "…" + p.spender.slice(-4);
      const expiryDate = new Date(p.expiry_unix_ms).toLocaleDateString(locale);
      return `Allow ${shortSpender} to spend up to ${p.allowance_max} ${p.asset.symbol} until ${expiryDate}.`;
    }
    case "Permit2": {
      const p = params as IntentTypes.Permit2Params;
      const shortSpender = p.spender.slice(0, 6) + "…" + p.spender.slice(-4);
      const expiryDate = new Date(p.expiry_unix_ms).toLocaleDateString(locale);
      return `Permit ${shortSpender} to spend up to ${p.amount_max} ${p.asset.symbol} until ${expiryDate}.`;
    }
    case "Mint": {
      const p = params as IntentTypes.MintParams;
      return `Mint ${p.quantity} NFT${p.quantity > 1 ? "s" : ""} from ${p.collection.slice(0, 10)}… for ${p.price_total} before ${fmtTime(p.deadline_unix_ms)}.`;
    }
    case "Stake": {
      const p = params as IntentTypes.StakeParams;
      return `Stake ${p.amount} ${p.asset.symbol} in pool ${p.pool_id.slice(0, 10)}….`;
    }
    case "Unstake": {
      const p = params as IntentTypes.UnstakeParams;
      return `Unstake ${p.amount} ${p.asset.symbol} from pool ${p.pool_id.slice(0, 10)}….`;
    }
    case "Borrow": {
      const p = params as IntentTypes.BorrowParams;
      return `Borrow ${p.amount} ${p.asset.symbol} with liquidation at ${p.ltv_liquidation}% LTV, interest ≤ ${(p.rate_cap_bps / 100).toFixed(2)}% APR, before ${fmtTime(p.deadline_unix_ms)}.`;
    }
    case "Repay": {
      const p = params as IntentTypes.RepayParams;
      return `Repay ${p.amount} ${p.asset.symbol} for loan ${p.loan_id.slice(0, 10)}… before ${fmtTime(p.deadline_unix_ms)}.`;
    }
    case "Bridge": {
      const p = params as IntentTypes.BridgeParams;
      const shortAddr = p.recipient.slice(0, 6) + "…" + p.recipient.slice(-4);
      return `Bridge ${p.amount} ${p.asset.symbol} to ${p.dst_chain} for ${shortAddr}, max fee ${(p.fee_cap_bps / 100).toFixed(2)}%, before ${fmtTime(p.deadline_unix_ms)}.`;
    }
    case "Vote": {
      const p = params as IntentTypes.VoteParams;
      return `Vote "${p.option}" on proposal ${p.proposal_id.slice(0, 10)}… before ${fmtTime(p.deadline_unix_ms)}.`;
    }
    case "SignData": {
      const p = params as IntentTypes.SignDataParams;
      return `Sign structured data: ${p.purpose}`;
    }
    case "Custom": {
      return `Custom action (schema: ${(params as IntentTypes.CustomParams).message_schema_id.slice(0, 10)}…)`;
    }
    default:
      return "Unknown action";
  }
}

export function validateIntent(
  intent: IntentTypes.Intent,
  locale: string = "en-US",
): IntentTypes.ValidationResult {
  if (!isValidIntent(intent)) {
    return {
      valid: false,
      error: { code: "INVALID_INTENT", message: "Intent failed schema validation" },
    };
  }

  const rendered = renderHumanText(intent.type, intent.params, locale);
  const computedHash = computeIntentHash(
    intent.type,
    intent.params,
    intent.human_template_id,
    locale,
  );

  // Normalize time formats: "07:33 PM" → "7:33 PM" to handle locale differences
  const normalizeTimeFormat = (str: string): string => {
    return (
      str
        .toLowerCase()
        .replace(/\s+/g, " ")
        // Normalize hour with leading zero: " 07:" → " 7:", " 07 " → " 7 "
        .replace(/\b0(\d{1,2}):/g, "$1:")
        .trim()
    );
  };

  const normalizedRendered = normalizeTimeFormat(rendered);
  const normalizedProvided = normalizeTimeFormat(intent.human_text);
  const mismatch = normalizedRendered !== normalizedProvided;

  return {
    valid: !mismatch,
    rendered_text: rendered,
    computed_hash: computedHash,
    provided_hash: computeIntentHash(intent.type, intent.params, intent.human_template_id, locale),
    mismatch,
    error: mismatch
      ? {
          code: "INTENT_MISMATCH",
          message: "Rendered human_text does not match provided human_text",
        }
      : undefined,
  };
}

export function createLegacyIntent(method: string, params: any): IntentTypes.LegacyIntent {
  const paramsStr = JSON.stringify(params);
  const hash = sha256(new TextEncoder().encode(paramsStr));
  return {
    type: "Legacy",
    fields: {
      raw_method: method,
      raw_params_hash: "sha256:" + bytesToHex(hash),
    },
    human_text: `Legacy request: ${method}`,
  };
}

export function createIntentEnvelope(
  intent: IntentTypes.Intent,
  locale?: string,
): IntentTypes.Envelope {
  return {
    version: INTENT_VERSION,
    intent,
    locale,
  };
}
