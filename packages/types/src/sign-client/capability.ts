/**
 * Capability-Scoped Permissions Types
 *
 * Types for capability-scoped permissions with quotas, limits, and enforcement.
 *
 * @see White Paper Mini-Playbook 4/10 — Capability-Scoped Permissions with Quotas
 */

export declare namespace CapabilityTypes {
  /**
   * Scope type determines the quota/ceiling semantics
   */
  type ScopeType = "once" | "count" | "value" | "rate" | "function";

  /**
   * Capability state machine
   */
  type CapabilityState = "active" | "expired" | "revoked" | "exhausted";

  /**
   * Scope limits define the boundaries of a permission
   * All numeric values are strings for precision (no IEEE float issues)
   */
  interface ScopeLimits {
    max_value_usd?: string;
    max_value_native?: string;
    max_calls?: number;
    per_minute?: number;
    per_hour?: number;
    asset_allow?: string[];
    function_allow?: string[];
    deadline_unix_ms: number;
    session_ttl_ms?: number;
  }

  /**
   * Capability scope as requested by dApp
   */
  interface Scope {
    type: ScopeType;
    limits: ScopeLimits;
    renewable: boolean;
    note?: string;
  }

  /**
   * Capability block in WC-WE envelope
   */
  interface CapabilityBlock {
    scope: Scope;
  }

  /**
   * Counter state for quota tracking
   */
  interface Counters {
    calls_used: number;
    value_used_native: string;
    window_resets_unix_ms: number;
  }

  /**
   * Capability token (cap_token) - what the wallet grants
   * Signed by wallet key
   */
  interface CapabilityToken {
    id: string;
    wallet_pubkey: string;
    dapp_pubkey: string;
    session_id: string;
    granted_unix_ms: number;
    granted_scope: Scope;
    counters: Counters;
    state: CapabilityState;
    sig_wallet: string;
  }

  /**
   * Deterministic hash for audit/revocation
   */
  interface CapabilityHash {
    hash: string;
    algorithm: "SHA256";
    inputs: {
      token: Omit<CapabilityToken, "sig_wallet">;
    };
  }

  /**
   * Enforcement result
   */
  interface EnforcementResult {
    allowed: boolean;
    reason?: string;
    updated_counters?: Counters;
    new_state?: CapabilityState;
  }

  /**
   * Call being checked against capability
   */
  interface CallRequest {
    name: string;
    asset: string;
    value_native: string;
  }

  /**
   * Safe defaults when dApp provides no scope
   */
  interface SafeDefaults {
    max_calls: number;
    max_value_native: string;
    asset_allow: string[];
    function_allow: string[];
    deadline_unix_ms: number;
    renewable: boolean;
  }

  /**
   * Revocation reason
   */
  type RevocationReason = "user" | "expired" | "exhausted" | "breach" | "timeout";

  /**
   * Revocation record
   */
  interface RevocationRecord {
    cap_id: string;
    reason: RevocationReason;
    detail?: string;
    revoked_at_unix_ms: number;
  }

  /**
   * Session capability summary (for UI)
   */
  interface CapabilitySummary {
    cap_id: string;
    app_origin: string;
    scope_sentence: string;
    status: CapabilityState;
    calls_used: number;
    calls_allowed: number;
    value_used: string;
    value_allowed: string;
    expires_at: string;
  }

  /**
   * Capability grant event
   */
  interface GrantEvent {
    type: "cap_granted";
    cap_hash: string;
    scope: Scope;
    timestamp_unix_ms: number;
  }

  /**
   * Capability use event
   */
  interface UseEvent {
    type: "cap_used";
    cap_id: string;
    call_name: string;
    value_native: string;
    timestamp_unix_ms: number;
  }

  /**
   * Capability revoked event
   */
  interface RevokeEvent {
    type: "cap_revoked";
    cap_id: string;
    reason: RevocationReason;
    timestamp_unix_ms: number;
  }

  /**
   * Capability denied event
   */
  interface DenyEvent {
    type: "cap_denied";
    reason: "policy" | "user_decline";
    requested_scope?: Scope;
    timestamp_unix_ms: number;
  }

  type CapabilityEvent = GrantEvent | UseEvent | RevokeEvent | DenyEvent;
}
