import { expect, describe, it } from "vitest";
import {
  INTENT_VERSION,
  INTENT_TYPES,
  isValidIntentType,
  isValidAsset,
  isValidSwapParams,
  isValidTransferParams,
  isValidApproveParams,
  isValidIntent,
  serializeCanonicalParams,
  computeIntentHash,
  renderHumanText,
  validateIntent,
  createLegacyIntent,
  createIntentEnvelope,
} from "../src";

describe("Intent", () => {
  describe("Constants", () => {
    it("INTENT_VERSION is defined", () => {
      expect(INTENT_VERSION).to.equal("1.0.0");
    });

    it("INTENT_TYPES contains all expected types", () => {
      expect(INTENT_TYPES).to.include.members([
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
      ]);
    });
  });

  describe("isValidIntentType", () => {
    it("returns true for valid intent types", () => {
      expect(isValidIntentType("Swap")).to.be.true;
      expect(isValidIntentType("Transfer")).to.be.true;
      expect(isValidIntentType("Approve")).to.be.true;
    });

    it("returns false for invalid intent types", () => {
      expect(isValidIntentType("Invalid")).to.be.false;
      expect(isValidIntentType("")).to.be.false;
      expect(isValidIntentType(null)).to.be.false;
      expect(isValidIntentType(undefined)).to.be.false;
    });
  });

  describe("isValidAsset", () => {
    it("returns true for valid asset", () => {
      const asset = {
        chain: "ethereum",
        symbol: "USDC",
        address: "0xA0b86a33E6441E6C7D3D4b6F5E7c8D9E0F1A2B3C",
        decimals: 6,
      };
      expect(isValidAsset(asset)).to.be.true;
    });

    it("returns false for invalid asset", () => {
      expect(isValidAsset(null)).to.be.false;
      expect(isValidAsset({})).to.be.false;
      expect(isValidAsset({ chain: "ethereum" })).to.be.false;
    });
  });

  describe("isValidSwapParams", () => {
    it("returns true for valid Swap params", () => {
      const params = {
        asset_in: {
          chain: "ethereum",
          symbol: "USDC",
          address: "0xA0b86a33E6441E6C7D3D4b6F5E7c8D9E0F1A2B3C",
          decimals: 6,
        },
        amount_in: "100.000000",
        asset_out: {
          chain: "ethereum",
          symbol: "WETH",
          address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          decimals: 18,
        },
        min_out: "0.029000000000000000",
        deadline_unix_ms: 1730885520000,
        fee_cap_bps: 30,
        recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      };
      expect(isValidSwapParams(params)).to.be.true;
    });

    it("returns false for invalid Swap params", () => {
      expect(isValidSwapParams(null)).to.be.false;
      expect(isValidSwapParams({})).to.be.false;
      expect(isValidSwapParams({ asset_in: null })).to.be.false;
    });
  });

  describe("isValidTransferParams", () => {
    it("returns true for valid Transfer params", () => {
      const params = {
        asset: {
          chain: "ethereum",
          symbol: "ETH",
          address: "0x0000000000000000000000000000000000000000",
          decimals: 18,
        },
        amount: "0.25",
        recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        deadline_unix_ms: 1730885520000,
      };
      expect(isValidTransferParams(params)).to.be.true;
    });

    it("returns false for missing deadline", () => {
      const params = {
        asset: {
          chain: "ethereum",
          symbol: "ETH",
          address: "0x0000000000000000000000000000000000000000",
          decimals: 18,
        },
        amount: "0.25",
        recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      };
      expect(isValidTransferParams(params)).to.be.false;
    });
  });

  describe("isValidApproveParams", () => {
    it("returns true for valid Approve params", () => {
      const params = {
        asset: {
          chain: "ethereum",
          symbol: "USDC",
          address: "0xA0b86a33E6441E6C7D3D4b6F5E7c8D9E0F1A2B3C",
          decimals: 6,
        },
        spender: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        allowance_max: "1000.000000",
        expiry_unix_ms: 1764518400000,
      };
      expect(isValidApproveParams(params)).to.be.true;
    });
  });

  describe("isValidIntent", () => {
    it("returns true for valid intent", () => {
      const intent = {
        type: "Swap",
        params: {
          asset_in: {
            chain: "ethereum",
            symbol: "USDC",
            address: "0xA0b86a33E6441E6C7D3D4b6F5E7c8D9E0F1A2B3C",
            decimals: 6,
          },
          amount_in: "100.000000",
          asset_out: {
            chain: "ethereum",
            symbol: "WETH",
            address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            decimals: 18,
          },
          min_out: "0.029000000000000000",
          deadline_unix_ms: 1730885520000,
          fee_cap_bps: 30,
          recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        },
        human_template_id: "swap.v1.basic",
        human_text: "Swap 100 USDC for at least 0.029 WETH before 10:32 with max fee 0.30%.",
      };
      expect(isValidIntent(intent)).to.be.true;
    });

    it("returns false for invalid intent type", () => {
      const intent = {
        type: "InvalidType",
        params: {},
        human_template_id: "test",
        human_text: "test",
      };
      expect(isValidIntent(intent)).to.be.false;
    });

    it("returns false for missing human_text", () => {
      const intent = {
        type: "Transfer",
        params: {
          asset: {
            chain: "ethereum",
            symbol: "ETH",
            address: "0x0000000000000000000000000000000000000000",
            decimals: 18,
          },
          amount: "0.25",
          recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          deadline_unix_ms: 1730885520000,
        },
        human_template_id: "transfer.v1.basic",
      };
      expect(isValidIntent(intent)).to.be.false;
    });
  });

  describe("serializeCanonicalParams", () => {
    it("serializes params with sorted keys", () => {
      const params = {
        z_key: "last",
        a_key: "first",
        m_key: "middle",
      };
      const serialized = serializeCanonicalParams(params);
      const parsed = JSON.parse(serialized);
      const keys = Object.keys(parsed);
      expect(keys).to.deep.equal(["a_key", "m_key", "z_key"]);
    });

    it("handles nested objects", () => {
      const params = {
        outer: {
          z_nested: 1,
          a_nested: 2,
        },
      };
      const serialized = serializeCanonicalParams(params);
      expect(serialized).to.include('"a_nested":2');
      expect(serialized).to.include('"z_nested":1');
    });
  });

  describe("computeIntentHash", () => {
    it("produces consistent hash for same inputs", () => {
      const type = "Transfer";
      const params = {
        asset: {
          chain: "ethereum",
          symbol: "ETH",
          address: "0x0000000000000000000000000000000000000000",
          decimals: 18,
        },
        amount: "0.25",
        recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        deadline_unix_ms: 1730885520000,
      };
      const templateId = "transfer.v1.basic";
      const locale = "en-US";

      const hash1 = computeIntentHash(type, params, templateId, locale);
      const hash2 = computeIntentHash(type, params, templateId, locale);

      expect(hash1).to.equal(hash2);
      expect(hash1).to.match(/^sha256:[a-f0-9]{64}$/);
    });

    it("produces different hash for different inputs", () => {
      const hash1 = computeIntentHash("Transfer", { amount: "100" }, "tpl1", "en-US");
      const hash2 = computeIntentHash("Transfer", { amount: "200" }, "tpl1", "en-US");

      expect(hash1).to.not.equal(hash2);
    });
  });

  describe("renderHumanText", () => {
    it("renders Transfer intent correctly", () => {
      const params = {
        asset: {
          chain: "ethereum",
          symbol: "ETH",
          address: "0x0000000000000000000000000000000000000000",
          decimals: 18,
        },
        amount: "0.25",
        recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        deadline_unix_ms: new Date("2024-11-06T18:00:00").getTime(),
      };

      const text = renderHumanText("Transfer", params, "en-US");
      expect(text).to.include("Send 0.25 ETH");
      expect(text).to.include("0x742d…0bEb");
    });

    it("renders Swap intent correctly", () => {
      const params = {
        asset_in: {
          chain: "ethereum",
          symbol: "USDC",
          address: "0xA0b86a33E6441E6C7D3D4b6F5E7c8D9E0F1A2B3C",
          decimals: 6,
        },
        amount_in: "100",
        asset_out: {
          chain: "ethereum",
          symbol: "WETH",
          address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          decimals: 18,
        },
        min_out: "0.029",
        deadline_unix_ms: new Date("2024-11-06T10:32:00").getTime(),
        fee_cap_bps: 30,
        recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      };

      const text = renderHumanText("Swap", params, "en-US");
      expect(text).to.include("Swap 100 USDC");
      expect(text).to.include("0.029 WETH");
      expect(text).to.include("0.30%");
    });

    it("renders Custom intent with schema id", () => {
      const params = {
        message_schema_id: "schema1234567890abcdef",
        message_fields_hash: "hash123",
      };

      const text = renderHumanText("Custom", params, "en-US");
      expect(text).to.include("Custom action");
      expect(text).to.include("schema1234");
    });
  });

  describe("validateIntent", () => {
    it("returns valid for matching intent", () => {
      const intent = {
        type: "Transfer" as const,
        params: {
          asset: {
            chain: "ethereum",
            symbol: "ETH",
            address: "0x0000000000000000000000000000000000000000",
            decimals: 18,
          },
          amount: "0.25",
          recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          deadline_unix_ms: new Date("2024-11-06T18:00:00").getTime(),
        },
        human_template_id: "transfer.v1.basic",
        human_text: renderHumanText(
          "Transfer",
          {
            asset: {
              chain: "ethereum",
              symbol: "ETH",
              address: "0x0000000000000000000000000000000000000000",
              decimals: 18,
            },
            amount: "0.25",
            recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            deadline_unix_ms: new Date("2024-11-06T18:00:00").getTime(),
          },
          "en-US",
        ),
      };

      const result = validateIntent(intent, "en-US");
      expect(result.valid).to.be.true;
      expect(result.mismatch).to.be.false;
    });

    it("returns invalid for mismatched human_text", () => {
      const intent = {
        type: "Transfer" as const,
        params: {
          asset: {
            chain: "ethereum",
            symbol: "ETH",
            address: "0x0000000000000000000000000000000000000000",
            decimals: 18,
          },
          amount: "0.25",
          recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          deadline_unix_ms: new Date("2024-11-06T18:00:00").getTime(),
        },
        human_template_id: "transfer.v1.basic",
        human_text: "This is clearly wrong",
      };

      const result = validateIntent(intent, "en-US");
      expect(result.valid).to.be.false;
      expect(result.mismatch).to.be.true;
      expect(result.error?.code).to.equal("INTENT_MISMATCH");
    });

    it("returns invalid for invalid intent schema", () => {
      const intent = {
        type: "Invalid",
        params: {},
        human_template_id: "test",
        human_text: "test",
      };

      const result = validateIntent(intent as any, "en-US");
      expect(result.valid).to.be.false;
      expect(result.error?.code).to.equal("INVALID_INTENT");
    });
  });

  describe("createLegacyIntent", () => {
    it("creates legacy intent from method and params", () => {
      const method = "eth_sendTransaction";
      const params = [{ to: "0x123", value: "0x0" }];

      const legacy = createLegacyIntent(method, params);

      expect(legacy.type).to.equal("Legacy");
      expect(legacy.fields.raw_method).to.equal(method);
      expect(legacy.fields.raw_params_hash).to.match(/^sha256:[a-f0-9]{64}$/);
      expect(legacy.human_text).to.include("eth_sendTransaction");
    });
  });

  describe("createIntentEnvelope", () => {
    it("creates envelope with intent and version", () => {
      const intent = {
        type: "Transfer" as const,
        params: {
          asset: {
            chain: "ethereum",
            symbol: "ETH",
            address: "0x0000000000000000000000000000000000000000",
            decimals: 18,
          },
          amount: "0.25",
          recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
          deadline_unix_ms: Date.now(),
        },
        human_template_id: "transfer.v1.basic",
        human_text: "Send 0.25 ETH",
      };

      const envelope = createIntentEnvelope(intent, "en-US");

      expect(envelope.version).to.equal(INTENT_VERSION);
      expect(envelope.intent).to.deep.equal(intent);
      expect(envelope.locale).to.equal("en-US");
    });
  });
});
