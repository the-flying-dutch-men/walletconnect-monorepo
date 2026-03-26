/**
 * WC-WE (WalletConnect - Waist Envelope) Typed Intent Types
 *
 * Provides type definitions for typed intents with human-readable descriptions
 * and canonical serialization for verification.
 *
 * @see White Paper Mini-Playbook 1/10 — Typed Intent with Plain-Language Templates
 */

export declare namespace IntentTypes {
  /**
   * Intent type catalog
   * Each type has a specific parameter schema
   */
  type IntentType =
    | "Swap"
    | "Transfer"
    | "Approve"
    | "Permit2"
    | "Mint"
    | "Stake"
    | "Unstake"
    | "Borrow"
    | "Repay"
    | "Bridge"
    | "Vote"
    | "SignData"
    | "Custom";

  /**
   * Asset definition for intent parameters
   * Follows CAIP conventions where applicable
   */
  interface Asset {
    chain: string;
    symbol: string;
    address: string;
    decimals: number;
  }

  /**
   * Intent parameters by type
   * Each intent type has specific required parameters
   */
  interface SwapParams {
    asset_in: Asset;
    amount_in: string;
    asset_out: Asset;
    min_out: string;
    deadline_unix_ms: number;
    fee_cap_bps: number;
    recipient: string;
  }

  interface TransferParams {
    asset: Asset;
    amount: string;
    recipient: string;
    deadline_unix_ms: number;
  }

  interface ApproveParams {
    asset: Asset;
    spender: string;
    allowance_max: string;
    expiry_unix_ms: number;
  }

  interface Permit2Params {
    asset: Asset;
    spender: string;
    amount_max: string;
    nonce: string;
    expiry_unix_ms: number;
  }

  interface MintParams {
    collection: string;
    token_id?: string;
    quantity: number;
    price_total: string;
    deadline_unix_ms: number;
    recipient: string;
  }

  interface StakeParams {
    asset: Asset;
    amount: string;
    pool_id: string;
    lock_until_unix_ms?: number;
  }

  interface UnstakeParams {
    asset: Asset;
    amount: string;
    pool_id: string;
  }

  interface BorrowParams {
    asset: Asset;
    amount: string;
    collateral_asset?: Asset;
    collateral_limit: string;
    ltv_liquidation: number;
    rate_cap_bps: number;
    deadline_unix_ms: number;
  }

  interface RepayParams {
    asset: Asset;
    amount: string;
    loan_id: string;
    deadline_unix_ms: number;
  }

  interface BridgeParams {
    asset: Asset;
    amount: string;
    dst_chain: string;
    recipient: string;
    fee_cap_bps: number;
    deadline_unix_ms: number;
  }

  interface VoteParams {
    proposal_id: string;
    option: string;
    snapshot_block: number;
    deadline_unix_ms: number;
  }

  interface SignDataParams {
    eip712_domain: Record<string, any>;
    message_schema_id: string;
    message_fields_hash: string;
    purpose: string;
  }

  interface CustomParams {
    message_schema_id: string;
    message_fields_hash: string;
    [key: string]: any;
  }

  /**
   * Union type for all intent parameters
   */
  type IntentParams =
    | SwapParams
    | TransferParams
    | ApproveParams
    | Permit2Params
    | MintParams
    | StakeParams
    | UnstakeParams
    | BorrowParams
    | RepayParams
    | BridgeParams
    | VoteParams
    | SignDataParams
    | CustomParams;

  /**
   * Intent specification structure
   * Defines the intent type, parameters, and human-readable template
   */
  interface Intent {
    type: IntentType;
    params: IntentParams;
    human_template_id: string;
    human_text: string;
  }

  /**
   * Locale code for human text rendering
   */
  type LocaleCode = string;

  /**
   * Intent hash structure for audit/receipts
   */
  interface IntentHash {
    hash: string;
    algorithm: "SHA256";
    inputs: {
      type: IntentType;
      params_serialized: string;
      template_id: string;
      locale: LocaleCode;
    };
  }

  /**
   * WC-WE Envelope structure
   * Top-level envelope for typed intent messages
   */
  interface Envelope {
    version: string;
    intent: Intent;
    locale?: LocaleCode;
  }

  /**
   * Validation result for intent verification
   */
  interface ValidationResult {
    valid: boolean;
    error?: {
      code: string;
      message: string;
    };
    rendered_text?: string;
    computed_hash?: string;
    provided_hash?: string;
    mismatch?: boolean;
  }

  /**
   * Legacy fallback structure for untyped requests
   */
  interface LegacyIntent {
    type: "Legacy";
    fields: {
      raw_method: string;
      raw_params_hash: string;
    };
    human_text: string;
  }

  /**
   * Intent context for request/response flow
   * Attached to session requests for validation and display
   */
  interface RequestContext {
    intent?: Intent | LegacyIntent;
    intent_hash?: string;
    validated: boolean;
    mismatch?: boolean;
  }
}
