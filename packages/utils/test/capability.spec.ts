import { expect, describe, it } from "vitest";
import {
  SAFE_DEFAULTS,
  SCOPE_TYPES,
  CAPABILITY_STATES,
  REVOCATION_REASONS,
  isValidScopeType,
  isValidCapabilityState,
  isValidScopeLimits,
  isValidScope,
  isValidCapabilityBlock,
  isValidCounters,
  isValidCapabilityToken,
  computeCapabilityHash,
  createCapabilityToken,
  synthesizeDefaultScope,
  checkCapabilityDeadline,
  checkCapabilityFunctionAllow,
  checkCapabilityAssetAllow,
  checkCapabilityCallsRemaining,
  checkCapabilityValueRemaining,
  enforceCapability,
  createRevocationRecord,
  createCapabilitySummary,
  createGrantEvent,
  createUseEvent,
  createRevokeEvent,
  createDenyEvent,
} from "../src";

describe("Capability", () => {
  describe("Constants", () => {
    it("SAFE_DEFAULTS has expected values", () => {
      expect(SAFE_DEFAULTS.max_calls).to.equal(1);
      expect(SAFE_DEFAULTS.max_value_native).to.equal("0.25");
      expect(SAFE_DEFAULTS.renewable).to.be.false;
    });

    it("SCOPE_TYPES contains all scope types", () => {
      expect(SCOPE_TYPES).to.include.members(["once", "count", "value", "rate", "function"]);
    });

    it("CAPABILITY_STATES contains all states", () => {
      expect(CAPABILITY_STATES).to.include.members(["active", "expired", "revoked", "exhausted"]);
    });

    it("REVOCATION_REASONS contains all reasons", () => {
      expect(REVOCATION_REASONS).to.include.members([
        "user",
        "expired",
        "exhausted",
        "breach",
        "timeout",
      ]);
    });
  });

  describe("isValidScopeType", () => {
    it("returns true for valid scope types", () => {
      expect(isValidScopeType("once")).to.be.true;
      expect(isValidScopeType("count")).to.be.true;
      expect(isValidScopeType("value")).to.be.true;
    });

    it("returns false for invalid scope types", () => {
      expect(isValidScopeType("invalid")).to.be.false;
      expect(isValidScopeType("")).to.be.false;
      expect(isValidScopeType(null)).to.be.false;
    });
  });

  describe("isValidCapabilityState", () => {
    it("returns true for valid states", () => {
      expect(isValidCapabilityState("active")).to.be.true;
      expect(isValidCapabilityState("expired")).to.be.true;
      expect(isValidCapabilityState("revoked")).to.be.true;
      expect(isValidCapabilityState("exhausted")).to.be.true;
    });

    it("returns false for invalid states", () => {
      expect(isValidCapabilityState("pending")).to.be.false;
      expect(isValidCapabilityState("")).to.be.false;
    });
  });

  describe("isValidScopeLimits", () => {
    it("returns true for valid limits", () => {
      const limits = {
        max_calls: 5,
        max_value_native: "1.5",
        deadline_unix_ms: Date.now() + 3600000,
        asset_allow: ["USDC", "WETH"],
        function_allow: ["transfer", "approve"],
      };
      expect(isValidScopeLimits(limits)).to.be.true;
    });

    it("returns false for missing deadline", () => {
      const limits = {
        max_calls: 5,
      };
      expect(isValidScopeLimits(limits)).to.be.false;
    });

    it("returns false for invalid asset_allow", () => {
      const limits = {
        deadline_unix_ms: Date.now() + 3600000,
        asset_allow: "not-an-array",
      };
      expect(isValidScopeLimits(limits)).to.be.false;
    });
  });

  describe("isValidScope", () => {
    it("returns true for valid scope", () => {
      const scope = {
        type: "count",
        limits: {
          max_calls: 5,
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
        note: "Test scope",
      };
      expect(isValidScope(scope)).to.be.true;
    });

    it("returns false for missing renewable flag", () => {
      const scope = {
        type: "once",
        limits: {
          deadline_unix_ms: Date.now() + 3600000,
        },
      };
      expect(isValidScope(scope)).to.be.false;
    });
  });

  describe("isValidCapabilityBlock", () => {
    it("returns true for valid capability block", () => {
      const block = {
        scope: {
          type: "once",
          limits: {
            deadline_unix_ms: Date.now() + 3600000,
          },
          renewable: false,
        },
      };
      expect(isValidCapabilityBlock(block)).to.be.true;
    });
  });

  describe("isValidCounters", () => {
    it("returns true for valid counters", () => {
      const counters = {
        calls_used: 2,
        value_used_native: "0.5",
        window_resets_unix_ms: Date.now() + 3600000,
      };
      expect(isValidCounters(counters)).to.be.true;
    });

    it("returns false for missing fields", () => {
      const counters = {
        calls_used: 2,
      };
      expect(isValidCounters(counters)).to.be.false;
    });
  });

  describe("isValidCapabilityToken", () => {
    it("returns true for valid token", () => {
      const token = {
        id: "cap_123",
        wallet_pubkey: "wallet_pubkey_abc",
        dapp_pubkey: "dapp_pubkey_xyz",
        session_id: "session_456",
        granted_unix_ms: Date.now(),
        granted_scope: {
          type: "count",
          limits: {
            max_calls: 5,
            deadline_unix_ms: Date.now() + 3600000,
          },
          renewable: false,
        },
        counters: {
          calls_used: 0,
          value_used_native: "0",
          window_resets_unix_ms: Date.now() + 3600000,
        },
        state: "active",
        sig_wallet: "signature_xyz",
      };
      expect(isValidCapabilityToken(token)).to.be.true;
    });

    it("returns false for missing required fields", () => {
      const token = {
        id: "cap_123",
        state: "active",
      };
      expect(isValidCapabilityToken(token)).to.be.false;
    });
  });

  describe("computeCapabilityHash", () => {
    it("produces consistent hash", () => {
      const token = {
        id: "cap_123",
        wallet_pubkey: "wallet_pubkey_abc",
        dapp_pubkey: "dapp_pubkey_xyz",
        session_id: "session_456",
        granted_unix_ms: 1234567890,
        granted_scope: {
          type: "once",
          limits: {
            deadline_unix_ms: 9876543210,
          },
          renewable: false,
        },
        counters: {
          calls_used: 0,
          value_used_native: "0",
          window_resets_unix_ms: 9876543210,
        },
        state: "active" as const,
      };

      const hash1 = computeCapabilityHash(token);
      const hash2 = computeCapabilityHash(token);

      expect(hash1).to.equal(hash2);
      expect(hash1).to.match(/^sha256:[a-f0-9]{64}$/);
    });
  });

  describe("createCapabilityToken", () => {
    it("creates token with correct structure", () => {
      const scope = {
        type: "count" as const,
        limits: {
          max_calls: 5,
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
      };

      const token = createCapabilityToken(
        "cap_123",
        "wallet_pubkey_abc",
        "dapp_pubkey_xyz",
        "session_456",
        scope,
        "signature_xyz",
      );

      expect(token.id).to.equal("cap_123");
      expect(token.state).to.equal("active");
      expect(token.counters.calls_used).to.equal(0);
      expect(token.counters.value_used_native).to.equal("0");
      expect(token.granted_scope).to.deep.equal(scope);
    });
  });

  describe("synthesizeDefaultScope", () => {
    it("creates default scope for method", () => {
      const scope = synthesizeDefaultScope("eth_sendTransaction", "ETH");

      expect(scope.type).to.equal("once");
      expect(scope.limits.max_calls).to.equal(1);
      expect(scope.limits.function_allow).to.deep.equal(["eth_sendTransaction"]);
      expect(scope.limits.asset_allow).to.deep.equal(["ETH"]);
      expect(scope.renewable).to.be.false;
    });

    it("handles missing asset", () => {
      const scope = synthesizeDefaultScope("personal_sign");

      expect(scope.limits.asset_allow).to.deep.equal([]);
    });
  });

  describe("checkCapabilityDeadline", () => {
    it("returns true for future deadline", () => {
      const scope = {
        type: "once" as const,
        limits: {
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
      };
      expect(checkCapabilityDeadline(scope)).to.be.true;
    });

    it("returns false for past deadline", () => {
      const scope = {
        type: "once" as const,
        limits: {
          deadline_unix_ms: Date.now() - 3600000,
        },
        renewable: false,
      };
      expect(checkCapabilityDeadline(scope)).to.be.false;
    });
  });

  describe("checkCapabilityFunctionAllow", () => {
    it("returns true when function is allowed", () => {
      const scope = {
        type: "once" as const,
        limits: {
          function_allow: ["transfer", "approve"],
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
      };
      expect(checkCapabilityFunctionAllow(scope, "transfer")).to.be.true;
    });

    it("returns false when function is not allowed", () => {
      const scope = {
        type: "once" as const,
        limits: {
          function_allow: ["transfer"],
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
      };
      expect(checkCapabilityFunctionAllow(scope, "swap")).to.be.false;
    });

    it("returns true when no function_allow specified", () => {
      const scope = {
        type: "once" as const,
        limits: {
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
      };
      expect(checkCapabilityFunctionAllow(scope, "any")).to.be.true;
    });
  });

  describe("checkCapabilityCallsRemaining", () => {
    it("returns true when calls remain", () => {
      const scope = {
        type: "count" as const,
        limits: {
          max_calls: 5,
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
      };
      const counters = {
        calls_used: 2,
        value_used_native: "0",
        window_resets_unix_ms: Date.now() + 3600000,
      };
      expect(checkCapabilityCallsRemaining(scope, counters)).to.be.true;
    });

    it("returns false when calls exhausted", () => {
      const scope = {
        type: "count" as const,
        limits: {
          max_calls: 3,
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
      };
      const counters = {
        calls_used: 3,
        value_used_native: "0",
        window_resets_unix_ms: Date.now() + 3600000,
      };
      expect(checkCapabilityCallsRemaining(scope, counters)).to.be.false;
    });
  });

  describe("checkCapabilityValueRemaining", () => {
    it("returns true when value is within limit", () => {
      const scope = {
        type: "value" as const,
        limits: {
          max_value_native: "1.0",
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
      };
      const counters = {
        calls_used: 0,
        value_used_native: "0.3",
        window_resets_unix_ms: Date.now() + 3600000,
      };
      expect(checkCapabilityValueRemaining(scope, counters, "0.5")).to.be.true;
    });

    it("returns false when value exceeds limit", () => {
      const scope = {
        type: "value" as const,
        limits: {
          max_value_native: "1.0",
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
      };
      const counters = {
        calls_used: 0,
        value_used_native: "0.8",
        window_resets_unix_ms: Date.now() + 3600000,
      };
      expect(checkCapabilityValueRemaining(scope, counters, "0.3")).to.be.false;
    });
  });

  describe("enforceCapability", () => {
    it("allows valid call and updates counters", () => {
      const token = {
        id: "cap_123",
        wallet_pubkey: "wallet_pubkey",
        dapp_pubkey: "dapp_pubkey",
        session_id: "session_456",
        granted_unix_ms: Date.now(),
        granted_scope: {
          type: "count" as const,
          limits: {
            max_calls: 3,
            deadline_unix_ms: Date.now() + 3600000,
          },
          renewable: false,
        },
        counters: {
          calls_used: 1,
          value_used_native: "0",
          window_resets_unix_ms: Date.now() + 3600000,
        },
        state: "active" as const,
        sig_wallet: "sig",
      };

      const call = {
        name: "transfer",
        asset: "ETH",
        value_native: "0.1",
      };

      const result = enforceCapability(token, call);

      expect(result.allowed).to.be.true;
      expect(result.updated_counters?.calls_used).to.equal(2);
    });

    it("rejects call when capability expired", () => {
      const token = {
        id: "cap_123",
        wallet_pubkey: "wallet_pubkey",
        dapp_pubkey: "dapp_pubkey",
        session_id: "session_456",
        granted_unix_ms: Date.now(),
        granted_scope: {
          type: "once" as const,
          limits: {
            deadline_unix_ms: Date.now() - 3600000,
          },
          renewable: false,
        },
        counters: {
          calls_used: 0,
          value_used_native: "0",
          window_resets_unix_ms: Date.now() - 3600000,
        },
        state: "active" as const,
        sig_wallet: "sig",
      };

      const call = {
        name: "transfer",
        asset: "ETH",
        value_native: "0.1",
      };

      const result = enforceCapability(token, call);

      expect(result.allowed).to.be.false;
      expect(result.reason).to.include("expired");
      expect(result.new_state).to.equal("expired");
    });

    it("rejects call when function not allowed", () => {
      const token = {
        id: "cap_123",
        wallet_pubkey: "wallet_pubkey",
        dapp_pubkey: "dapp_pubkey",
        session_id: "session_456",
        granted_unix_ms: Date.now(),
        granted_scope: {
          type: "once" as const,
          limits: {
            function_allow: ["transfer"],
            deadline_unix_ms: Date.now() + 3600000,
          },
          renewable: false,
        },
        counters: {
          calls_used: 0,
          value_used_native: "0",
          window_resets_unix_ms: Date.now() + 3600000,
        },
        state: "active" as const,
        sig_wallet: "sig",
      };

      const call = {
        name: "swap",
        asset: "ETH",
        value_native: "0.1",
      };

      const result = enforceCapability(token, call);

      expect(result.allowed).to.be.false;
      expect(result.new_state).to.equal("revoked");
    });

    it("sets exhausted state when quota depleted", () => {
      const token = {
        id: "cap_123",
        wallet_pubkey: "wallet_pubkey",
        dapp_pubkey: "dapp_pubkey",
        session_id: "session_456",
        granted_unix_ms: Date.now(),
        granted_scope: {
          type: "count" as const,
          limits: {
            max_calls: 2,
            deadline_unix_ms: Date.now() + 3600000,
          },
          renewable: false,
        },
        counters: {
          calls_used: 1,
          value_used_native: "0",
          window_resets_unix_ms: Date.now() + 3600000,
        },
        state: "active" as const,
        sig_wallet: "sig",
      };

      const call = {
        name: "transfer",
        asset: "ETH",
        value_native: "0.1",
      };

      const result = enforceCapability(token, call);

      expect(result.allowed).to.be.true;
      expect(result.new_state).to.equal("exhausted");
    });
  });

  describe("createRevocationRecord", () => {
    it("creates revocation record", () => {
      const record = createRevocationRecord("cap_123", "user", "User clicked revoke");

      expect(record.cap_id).to.equal("cap_123");
      expect(record.reason).to.equal("user");
      expect(record.detail).to.equal("User clicked revoke");
      expect(record.revoked_at_unix_ms).to.be.a("number");
    });
  });

  describe("createCapabilitySummary", () => {
    it("creates summary for UI display", () => {
      const token = {
        id: "cap_123",
        wallet_pubkey: "wallet_pubkey",
        dapp_pubkey: "dapp_pubkey",
        session_id: "session_456",
        granted_unix_ms: Date.now(),
        granted_scope: {
          type: "count" as const,
          limits: {
            max_calls: 5,
            max_value_native: "1.0",
            deadline_unix_ms: Date.now() + 3600000,
          },
          renewable: false,
        },
        counters: {
          calls_used: 2,
          value_used_native: "0.5",
          window_resets_unix_ms: Date.now() + 3600000,
        },
        state: "active" as const,
        sig_wallet: "sig",
      };

      const summary = createCapabilitySummary(token, "https://app.example.com");

      expect(summary.cap_id).to.equal("cap_123");
      expect(summary.app_origin).to.equal("https://app.example.com");
      expect(summary.status).to.equal("active");
      expect(summary.calls_used).to.equal(2);
      expect(summary.calls_allowed).to.equal(5);
    });
  });

  describe("Events", () => {
    it("createGrantEvent creates grant event", () => {
      const scope = {
        type: "once" as const,
        limits: {
          deadline_unix_ms: Date.now() + 3600000,
        },
        renewable: false,
      };

      const event = createGrantEvent("hash_abc", scope);

      expect(event.type).to.equal("cap_granted");
      expect(event.cap_hash).to.equal("hash_abc");
      expect(event.timestamp_unix_ms).to.be.a("number");
    });

    it("createUseEvent creates use event", () => {
      const event = createUseEvent("cap_123", "transfer", "0.1");

      expect(event.type).to.equal("cap_used");
      expect(event.cap_id).to.equal("cap_123");
      expect(event.call_name).to.equal("transfer");
      expect(event.value_native).to.equal("0.1");
    });

    it("createRevokeEvent creates revoke event", () => {
      const event = createRevokeEvent("cap_123", "user");

      expect(event.type).to.equal("cap_revoked");
      expect(event.cap_id).to.equal("cap_123");
      expect(event.reason).to.equal("user");
    });

    it("createDenyEvent creates deny event", () => {
      const event = createDenyEvent("policy");

      expect(event.type).to.equal("cap_denied");
      expect(event.reason).to.equal("policy");
    });
  });
});
