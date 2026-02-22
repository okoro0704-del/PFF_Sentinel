/**
 * PFF Sentinel — Check Deployer Balance
 * Verifies the deployer wallet has enough MATIC for gas fees
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function main() {
  console.log("💰 Checking Deployer Wallet Balance...\n");
  console.log("=" .repeat(80));

  // Get deployer address
  let deployerAddress;
  let deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!deployerPrivateKey) {
    // Try to load from deployments folder
    const walletPath = path.join(__dirname, "..", "deployments", "deployer-wallet.json");
    if (fs.existsSync(walletPath)) {
      const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));
      deployerAddress = walletData.address;
      deployerPrivateKey = walletData.privateKey;
      console.log("✅ Loaded deployer wallet from deployments/deployer-wallet.json");
    } else {
      console.error("❌ ERROR: DEPLOYER_PRIVATE_KEY not found in .env");
      console.error("   Run: node scripts/generate-all-wallets.js first");
      process.exit(1);
    }
  } else {
    const wallet = new ethers.Wallet(deployerPrivateKey);
    deployerAddress = wallet.address;
  }

  console.log(`\n📋 Deployer Address: ${deployerAddress}`);

  // Connect to Polygon
  const RPC_URLS = [
    "https://polygon-pokt.nodies.app",
    "https://polygon-bor-rpc.publicnode.com",
    "https://1rpc.io/matic"
  ];

  let provider;
  let connected = false;

  for (const rpcUrl of RPC_URLS) {
    try {
      console.log(`\n🔗 Connecting to: ${rpcUrl}...`);
      provider = new ethers.JsonRpcProvider(rpcUrl);
      await provider.getNetwork(); // Test connection
      console.log("   ✅ Connected!");
      connected = true;
      break;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  if (!connected) {
    console.error("\n❌ Could not connect to any Polygon RPC");
    console.error("   Please check your internet connection or try again later");
    process.exit(1);
  }

  console.log("\n" + "=" .repeat(80));

  try {
    // Get balance
    const balance = await provider.getBalance(deployerAddress);
    const balanceInMatic = ethers.formatEther(balance);

    console.log("\n💰 BALANCE CHECK:");
    console.log("   Balance: " + balanceInMatic + " MATIC");
    console.log("   Address: " + deployerAddress);

    // Check if sufficient
    const minRequired = 0.1; // Minimum 0.1 MATIC recommended
    const recommended = 0.5; // Recommended 0.5 MATIC

    console.log("\n" + "-".repeat(80));

    if (parseFloat(balanceInMatic) >= recommended) {
      console.log("\n✅ EXCELLENT! You have enough MATIC for deployment.");
      console.log(`   Balance: ${balanceInMatic} MATIC`);
      console.log(`   Recommended: ${recommended} MATIC`);
      console.log("\n🚀 You're ready to deploy contracts!");
    } else if (parseFloat(balanceInMatic) >= minRequired) {
      console.log("\n⚠️  SUFFICIENT but low. You have enough for deployment.");
      console.log(`   Balance: ${balanceInMatic} MATIC`);
      console.log(`   Minimum: ${minRequired} MATIC`);
      console.log(`   Recommended: ${recommended} MATIC`);
      console.log("\n💡 Consider adding more MATIC for safety.");
    } else {
      console.log("\n❌ INSUFFICIENT MATIC! You need more funds.");
      console.log(`   Current: ${balanceInMatic} MATIC`);
      console.log(`   Minimum: ${minRequired} MATIC`);
      console.log(`   Recommended: ${recommended} MATIC`);
      console.log(`   Needed: ${(recommended - parseFloat(balanceInMatic)).toFixed(4)} MATIC`);
      console.log("\n📝 How to get MATIC:");
      console.log("   1. Buy on exchange (Binance, Coinbase, etc.)");
      console.log("   2. Bridge from Ethereum: https://wallet.polygon.technology/");
      console.log("   3. Use faucet (testnet only): https://faucet.polygon.technology/");
      console.log(`\n   Send MATIC to: ${deployerAddress}`);
    }

    console.log("\n" + "=" .repeat(80));
    console.log("\n🔗 View on Polygonscan:");
    console.log(`   https://polygonscan.com/address/${deployerAddress}`);
    console.log("\n" + "=" .repeat(80) + "\n");

  } catch (error) {
    console.error("\n❌ Error checking balance:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

