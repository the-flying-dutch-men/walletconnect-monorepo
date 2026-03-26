import { CapabilityTypes } from "@walletconnect/types";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import { isValidObject, isValidString, isValidNumber } from "./validators.js";

export const SAFE_DEFAULTS: CapabilityTypes.SafeDefaults = {
  max_calls: 1,
  max_value_native: "0.25",
  asset_allow: [],
  function_allow: [],
  deadline_unix_ms: Date.now() + 60 * 60 * 1000,
  renewable: false,
};

export const SCOPE_TYPES: CapabilityTypes.ScopeType[] = [
  "once",
  "count",
  "value",
  "rate",
  "function",
];

export const CAPABILITY_STATES: CapabilityTypes.CapabilityState[] = [
  "active",
  "expired",
  "revoked",
  "exhausted",
];

export const REVOCATION_REASONS: CapabilityTypes.RevocationReason[] = [
  "user",
  "expired",
  "exhausted",
  "breach",
  "timeout",
];

export function isValidScopeType(type: any): boolean {
  return SCOPE_TYPES.includes(type);
}

export function isValidCapabilityState(state: any): boolean {
  return CAPABILITY_STATES.includes(state);
}

export function isValidScopeLimits(limits: any): boolean {
  if (!isValidObject(limits)) return false;
  if (!isValidNumber(limits.deadline_unix_ms, false)) return false;

  if (limits.max_value_usd !== undefined && !isValidString(limits.max_value_usd, true))
    return false;
  if (limits.max_value_native !== undefined && !isValidString(limits.max_value_native, true))
    return false;
  if (limits.max_calls !== undefined && !isValidNumber(limits.max_calls, true)) return false;
  if (limits.per_minute !== undefined && !isValidNumber(limits.per_minute, true)) return false;
  if (limits.per_hour !== undefined && !isValidNumber(limits.per_hour, true)) return false;

  if (limits.asset_allow !== undefined) {
    if (!Array.isArray(limits.asset_allow)) return false;
    if (!limits.asset_allow.every((a: any) => isValidString(a, false))) return false;
  }

  if (limits.function_allow !== undefined) {
    if (!Array.isArray(limits.function_allow)) return false;
    if (!limits.function_allow.every((f: any) => isValidString(f, false))) return false;
  }

  if (limits.session_ttl_ms !== undefined && !isValidNumber(limits.session_ttl_ms, true))
    return false;

  return true;
}

export function isValidScope(scope: any): boolean {
  if (!isValidObject(scope)) return false;
  if (!isValidScopeType(scope.type)) return false;
  if (!isValidScopeLimits(scope.limits)) return false;
  if (typeof scope.renewable !== "boolean") return false;
  if (scope.note !== undefined && !isValidString(scope.note, true)) return false;
  return true;
}

export function isValidCapabilityBlock(block: any): boolean {
  if (!isValidObject(block)) return false;
  return isValidScope(block.scope);
}

export function isValidCounters(counters: any): boolean {
  if (!isValidObject(counters)) return false;
  if (!isValidNumber(counters.calls_used, false)) return false;
  if (!isValidString(counters.value_used_native, false)) return false;
  return isValidNumber(counters.window_resets_unix_ms, false);
}

export function isValidCapabilityToken(token: any): token is CapabilityTypes.CapabilityToken {
  if (!isValidObject(token)) return false;

  return (
    isValidString(token.id, false) &&
    isValidString(token.wallet_pubkey, false) &&
    isValidString(token.dapp_pubkey, false) &&
    isValidString(token.session_id, false) &&
    isValidNumber(token.granted_unix_ms, false) &&
    isValidScope(token.granted_scope) &&
    isValidCounters(token.counters) &&
    isValidCapabilityState(token.state) &&
    isValidString(token.sig_wallet, false)
  );
}

export function computeCapabilityHash(
  token: Omit<CapabilityTypes.CapabilityToken, "sig_wallet">,
): string {
  const data = JSON.stringify({
    id: token.id,
    wallet_pubkey: token.wallet_pubkey,
    dapp_pubkey: token.dapp_pubkey,
    session_id: token.session_id,
    granted_unix_ms: token.granted_unix_ms,
    granted_scope: token.granted_scope,
    counters: token.counters,
    state: token.state,
  });
  const hash = sha256(new TextEncoder().encode(data));
  return "sha256:" + bytesToHex(hash);
}

export function createCapabilityToken(
  id: string,
  walletPubkey: string,
  dappPubkey: string,
  sessionId: string,
  scope: CapabilityTypes.Scope,
  walletSignature: string,
): CapabilityTypes.CapabilityToken {
  const now = Date.now();
  const token: CapabilityTypes.CapabilityToken = {
    id,
    wallet_pubkey: walletPubkey,
    dapp_pubkey: dappPubkey,
    session_id: sessionId,
    granted_unix_ms: now,
    granted_scope: scope,
    counters: {
      calls_used: 0,
      value_used_native: "0",
      window_resets_unix_ms: now + (scope.limits.session_ttl_ms || 60 * 60 * 1000),
    },
    state: "active",
    sig_wallet: walletSignature,
  };
  return token;
}

export function synthesizeDefaultScope(method: string, asset?: string): CapabilityTypes.Scope {
  return {
    type: "once",
    limits: {
      max_calls: SAFE_DEFAULTS.max_calls,
      max_value_native: SAFE_DEFAULTS.max_value_native,
      asset_allow: asset ? [asset] : SAFE_DEFAULTS.asset_allow,
      function_allow: [method],
      deadline_unix_ms: SAFE_DEFAULTS.deadline_unix_ms,
    },
    renewable: SAFE_DEFAULTS.renewable,
    note: "Default scope synthesized by wallet",
  };
}

export function checkCapabilityDeadline(scope: CapabilityTypes.Scope): boolean {
  return Date.now() <= scope.limits.deadline_unix_ms;
}

export function checkCapabilityFunctionAllow(
  scope: CapabilityTypes.Scope,
  functionName: string,
): boolean {
  if (!scope.limits.function_allow || scope.limits.function_allow.length === 0) {
    return true;
  }
  return scope.limits.function_allow.includes(functionName);
}

export function checkCapabilityAssetAllow(scope: CapabilityTypes.Scope, asset: string): boolean {
  if (!scope.limits.asset_allow || scope.limits.asset_allow.length === 0) {
    return true;
  }
  return scope.limits.asset_allow.includes(asset);
}

export function checkCapabilityCallsRemaining(
  scope: CapabilityTypes.Scope,
  counters: CapabilityTypes.Counters,
): boolean {
  if (scope.limits.max_calls === undefined) return true;
  return counters.calls_used < scope.limits.max_calls;
}

export function checkCapabilityValueRemaining(
  scope: CapabilityTypes.Scope,
  counters: CapabilityTypes.Counters,
  valueToSpend: string,
): boolean {
  if (scope.limits.max_value_native === undefined) return true;

  const currentUsed = BigInt(counters.value_used_native.split(".")[0] || "0");
  const toSpend = BigInt(valueToSpend.split(".")[0] || "0");
  const maxValue = BigInt(scope.limits.max_value_native.split(".")[0] || "0");

  return currentUsed + toSpend <= maxValue;
}

export function enforceCapability(
  token: CapabilityTypes.CapabilityToken,
  call: CapabilityTypes.CallRequest,
): CapabilityTypes.EnforcementResult {
  if (token.state !== "active") {
    return {
      allowed: false,
      reason: `Capability is ${token.state}`,
    };
  }

  if (!checkCapabilityDeadline(token.granted_scope)) {
    return {
      allowed: false,
      reason: "Capability expired",
      new_state: "expired",
    };
  }

  if (!checkCapabilityFunctionAllow(token.granted_scope, call.name)) {
    return {
      allowed: false,
      reason: `Function ${call.name} not allowed`,
      new_state: "revoked",
    };
  }

  if (!checkCapabilityAssetAllow(token.granted_scope, call.asset)) {
    return {
      allowed: false,
      reason: `Asset ${call.asset} not allowed`,
      new_state: "revoked",
    };
  }

  if (!checkCapabilityCallsRemaining(token.granted_scope, token.counters)) {
    return {
      allowed: false,
      reason: "Call quota exhausted",
      new_state: "exhausted",
    };
  }

  if (!checkCapabilityValueRemaining(token.granted_scope, token.counters, call.value_native)) {
    return {
      allowed: false,
      reason: `Value limit exceeded (would spend ${call.value_native})`,
      new_state: "revoked",
    };
  }

  const newCallsUsed = token.counters.calls_used + 1;
  const currentValue = token.counters.value_used_native.split(".")[0] || "0";
  const callValue = call.value_native.split(".")[0] || "0";
  const newValueUsed = (BigInt(currentValue) + BigInt(callValue)).toString();

  const updatedCounters: CapabilityTypes.Counters = {
    ...token.counters,
    calls_used: newCallsUsed,
    value_used_native: newValueUsed,
  };

  const isExhausted =
    (token.granted_scope.limits.max_calls !== undefined &&
      newCallsUsed >= token.granted_scope.limits.max_calls) ||
    (token.granted_scope.limits.max_value_native !== undefined &&
      BigInt(newValueUsed) >= BigInt(token.granted_scope.limits.max_value_native));

  return {
    allowed: true,
    updated_counters: updatedCounters,
    new_state: isExhausted ? "exhausted" : "active",
  };
}

export function createRevocationRecord(
  capId: string,
  reason: CapabilityTypes.RevocationReason,
  detail?: string,
): CapabilityTypes.RevocationRecord {
  return {
    cap_id: capId,
    reason,
    detail,
    revoked_at_unix_ms: Date.now(),
  };
}

export function createCapabilitySummary(
  token: CapabilityTypes.CapabilityToken,
  appOrigin: string,
): CapabilityTypes.CapabilitySummary {
  const scope = token.granted_scope;
  const counters = token.counters;

  const callsAllowed = scope.limits.max_calls ?? Infinity;
  const valueAllowed = scope.limits.max_value_native ?? "∞";

  const formatValue = (val: string) => {
    if (val === "∞") return "∞";
    const num = parseFloat(val);
    if (num >= 1) return num.toFixed(4);
    return num.toPrecision(4);
  };

  const scopeSentence = `${scope.type} scope: ${callsAllowed === Infinity ? "unlimited" : callsAllowed} calls, max ${formatValue(valueAllowed.toString())} native, expires ${new Date(scope.limits.deadline_unix_ms).toLocaleString()}`;

  return {
    cap_id: token.id,
    app_origin: appOrigin,
    scope_sentence: scopeSentence,
    status: token.state,
    calls_used: counters.calls_used,
    calls_allowed: callsAllowed === Infinity ? -1 : callsAllowed,
    value_used: formatValue(counters.value_used_native),
    value_allowed: valueAllowed.toString(),
    expires_at: new Date(scope.limits.deadline_unix_ms).toISOString(),
  };
}

export function createGrantEvent(
  capHash: string,
  scope: CapabilityTypes.Scope,
): CapabilityTypes.GrantEvent {
  return {
    type: "cap_granted",
    cap_hash: capHash,
    scope,
    timestamp_unix_ms: Date.now(),
  };
}

export function createUseEvent(
  capId: string,
  callName: string,
  valueNative: string,
): CapabilityTypes.UseEvent {
  return {
    type: "cap_used",
    cap_id: capId,
    call_name: callName,
    value_native: valueNative,
    timestamp_unix_ms: Date.now(),
  };
}

export function createRevokeEvent(
  capId: string,
  reason: CapabilityTypes.RevocationReason,
): CapabilityTypes.RevokeEvent {
  return {
    type: "cap_revoked",
    cap_id: capId,
    reason,
    timestamp_unix_ms: Date.now(),
  };
}

export function createDenyEvent(
  reason: "policy" | "user_decline",
  requestedScope?: CapabilityTypes.Scope,
): CapabilityTypes.DenyEvent {
  return {
    type: "cap_denied",
    reason,
    requested_scope: requestedScope,
    timestamp_unix_ms: Date.now(),
  };
}
