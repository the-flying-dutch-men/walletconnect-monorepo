import { EthereumProvider } from "@walletconnect/ethereum-provider";
import qrcode from "qrcode-terminal";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const PROJECT_ID =
  process.env.PROJECT_ID ||
  process.env.NEXT_PUBLIC_PROJECT_ID ||
  "fda34ca30b10201a1e5b5a8931eb90cc";

/**
 * Intent examples for testing
 */
// Helper to format time the same way as renderHumanText
const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const EXAMPLE_INTENTS = {
  transfer: (() => {
    const deadline = Date.now() + 3600000;
    return {
      type: "Transfer",
      params: {
        asset: {
          chain: "ethereum",
          symbol: "ETH",
          address: "0x0000000000000000000000000000000000000000",
          decimals: 18,
        },
        amount: "0.01",
        recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        deadline_unix_ms: deadline,
      },
      human_template_id: "transfer.v1.basic",
      human_text: `Send 0.01 ETH to 0x742d…0bEb before ${fmtTime(deadline)}.`,
    };
  })(),

  swap: (() => {
    const deadline = Date.now() + 3600000;
    return {
      type: "Swap",
      params: {
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
        deadline_unix_ms: deadline,
        fee_cap_bps: 30,
        recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      },
      human_template_id: "swap.v1.basic",
      human_text: `Swap 100 USDC for at least 0.029 WETH before ${fmtTime(deadline)} with max fee 0.30%.`,
    };
  })(),

  approve: (() => {
    const expiry = Date.now() + 86400000 * 30;
    return {
      type: "Approve",
      params: {
        asset: {
          chain: "ethereum",
          symbol: "USDC",
          address: "0xA0b86a33E6441E6C7D3D4b6F5E7c8D9E0F1A2B3C",
          decimals: 6,
        },
        spender: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        allowance_max: "1000",
        expiry_unix_ms: expiry,
      },
      human_template_id: "approve.v1.basic",
      human_text: `Allow 0x7a25…488D to spend up to 1,000 USDC until ${new Date(expiry).toLocaleDateString("en-US")}.`,
    };
  })(),
};

async function main() {
  console.log("=== WC-WE Typed Intent Test dApp ===\n");

  console.log("Initializing WalletConnect provider...");

  const provider = await EthereumProvider.init({
    projectId: PROJECT_ID,
    chains: [1, 11155111],
    showQrModal: false,
    methods: [
      "eth_sendTransaction",
      "personal_sign",
      "eth_signTypedData_v4",
      "wc_typedIntentRequest",
    ],
    events: ["chainChanged", "accountsChanged"],
  });

  provider.on("display_uri", (uri: string) => {
    console.log("\nScan this QR code with your wallet:\n");
    qrcode.generate(uri, { small: true });
    console.log("\nOr use this URI:\n", uri, "\n");
  });

  console.log("Connecting to wallet...");
  await provider.enable();

  const accounts = provider.accounts;
  console.log("\n✓ Connected!");
  console.log("Account:", accounts[0]);
  console.log("Chain:", provider.chainId);

  // Main menu loop
  while (true) {
    console.log("\n--- Select Action ---");
    console.log("1. Send Transfer with Intent");
    console.log("2. Send Swap with Intent");
    console.log("3. Send Approve with Intent");
    console.log("4. Send Legacy Transaction (no intent)");
    console.log("5. Test Invalid Intent (mismatch)");
    console.log("6. Exit");

    const choice = await new Promise<string>((resolve) => {
      rl.question("\nChoice: ", resolve);
    });

    try {
      switch (choice) {
        case "1":
          await sendIntentRequest(provider, EXAMPLE_INTENTS.transfer);
          break;
        case "2":
          await sendIntentRequest(provider, EXAMPLE_INTENTS.swap);
          break;
        case "3":
          await sendIntentRequest(provider, EXAMPLE_INTENTS.approve);
          break;
        case "4":
          await sendLegacyTransaction(provider);
          break;
        case "5":
          await sendInvalidIntent(provider);
          break;
        case "6":
          console.log("\nDisconnecting...");
          await provider.disconnect();
          rl.close();
          process.exit(0);
        default:
          console.log("Invalid choice");
      }
    } catch (error: any) {
      console.error("Error:", error.message || error);
    }
  }
}

async function sendIntentRequest(provider: any, intent: any) {
  console.log("\n📤 Sending request with typed intent...");
  console.log("Intent type:", intent.type);
  console.log("Human text:", intent.human_text);

  const transaction = {
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    value: "0x2386f26fc10000", // 0.01 ETH
    data: "0x",
    gasLimit: "0x5208",
  };

  try {
    const result = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          ...transaction,
          // NEW: Attach typed intent inside transaction params
          intent: intent,
        },
      ],
    });

    console.log("✅ Success! Transaction hash:", result);
  } catch (error: any) {
    console.error("❌ Failed:", error.message || error);
    if (error.message?.includes("Intent validation failed")) {
      console.log("   The wallet rejected due to intent validation!");
    }
  }
}

async function sendLegacyTransaction(provider: any) {
  console.log("\n📤 Sending legacy transaction (no intent)...");

  const transaction = {
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    value: "0x2386f26fc10000",
    data: "0x",
    gasLimit: "0x5208",
  };

  try {
    const result = await provider.request({
      method: "eth_sendTransaction",
      params: [transaction],
      // No intent attached
    });

    console.log("✅ Success! Transaction hash:", result);
    console.log("   (Wallet processed without typed intent)");
  } catch (error: any) {
    console.error("❌ Failed:", error.message || error);
  }
}

async function sendInvalidIntent(provider: any) {
  console.log("\n📤 Sending request with INVALID intent (mismatch)...");

  const deadline = Date.now() + 3600000;
  const invalidIntent = {
    type: "Transfer",
    params: {
      asset: {
        chain: "ethereum",
        symbol: "ETH",
        address: "0x0000000000000000000000000000000000000000",
        decimals: 18,
      },
      amount: "0.01",
      recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      deadline_unix_ms: deadline,
    },
    human_template_id: "transfer.v1.basic",
    // MISMATCH: Says 100 ETH but params say 0.01
    human_text: `Send 100 ETH to 0x742d…0bEb before ${fmtTime(deadline)}.`,
  };

  const transaction = {
    to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    value: "0x2386f26fc10000",
    data: "0x",
    gasLimit: "0x5208",
  };

  try {
    const result = await provider.request({
      method: "eth_sendTransaction",
      params: [transaction],
      intent: invalidIntent,
    });

    console.log("✅ Success! Transaction hash:", result);
  } catch (error: any) {
    console.error("❌ Failed:", error.message || error);
    if (error.message?.includes("Intent validation failed")) {
      console.log("   ✓ Wallet correctly detected the mismatch!");
    }
  }
}

main().catch(console.error);
