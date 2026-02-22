/**
 * Check who owns the VIDA Token contract
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🔍 Checking VIDA Token Contract Owner...\n");

  const VIDA_TOKEN_ADDRESS = "0xDc6EFba149b47f6F6d77AC0523c51F204964C12E";
  // Try multiple public RPCs
  const RPC_URLS = [
    "https://polygon-pokt.nodies.app",
    "https://polygon-bor-rpc.publicnode.com",
    "https://1rpc.io/matic"
  ];

  const POLYGON_RPC = process.env.POLYGON_RPC_URL || RPC_URLS[0];

  // Connect to Polygon
  const provider = new ethers.JsonRpcProvider(POLYGON_RPC);

  // VIDA Token ABI (just the owner function)
  const VIDA_ABI = [
    "function owner() view returns (address)"
  ];

  try {
    const vidaContract = new ethers.Contract(VIDA_TOKEN_ADDRESS, VIDA_ABI, provider);
    
    console.log("📋 Contract Details:");
    console.log("   VIDA Token Address:", VIDA_TOKEN_ADDRESS);
    console.log("   Network: Polygon Mainnet");
    console.log("\n" + "=".repeat(80) + "\n");

    // Get the owner
    const owner = await vidaContract.owner();
    
    console.log("👑 Contract Owner:", owner);
    console.log("\n" + "=".repeat(80) + "\n");

    // Check against your addresses
    const expectedSentinel = "0xddAe70eE45AFb5D0a7d65688844Ea61c9B617dfd";
    const derivedFromKey = "0x72Df9c801B5aee88cb126663FeE4746f655a463d";

    console.log("🔍 Comparison:");
    console.log("   Actual Owner:        ", owner);
    console.log("   Expected Sentinel:   ", expectedSentinel);
    console.log("   Derived from Key:    ", derivedFromKey);
    console.log("\n" + "-".repeat(80) + "\n");

    if (owner.toLowerCase() === expectedSentinel.toLowerCase()) {
      console.log("✅ Owner matches Expected Sentinel Vault!");
      console.log("\n⚠️  You need the private key for:", expectedSentinel);
      console.log("   The private key you provided belongs to a different wallet.");
    } else if (owner.toLowerCase() === derivedFromKey.toLowerCase()) {
      console.log("✅ Owner matches the address derived from your private key!");
      console.log("\n🎯 SOLUTION: Update Sentinel Vault address to:", derivedFromKey);
      console.log("   Your private key is correct, but the address in config is wrong.");
    } else {
      console.log("❌ Owner is a DIFFERENT address!");
      console.log("\n⚠️  The contract is owned by:", owner);
      console.log("   You need the private key for this address.");
    }

    console.log("\n" + "=".repeat(80));

  } catch (error) {
    console.error("❌ Error checking contract owner:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

