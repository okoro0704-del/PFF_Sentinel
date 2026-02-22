/**
 * PFF Sentinel — Verify Sentinel Private Key
 * Confirms that the private key matches the Sentinel Vault address
 */

import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("🔐 Verifying Sentinel Private Key...\n");

  // Get private key from environment
  const privateKey = process.env.VITE_SENTINEL_PRIVATE_KEY;
  const expectedAddress = process.env.VITE_SENTINEL_WALLET_ADDRESS || "0xddAe70eE45AFb5D0a7d65688844Ea61c9B617dfd";

  if (!privateKey) {
    console.error("❌ ERROR: VITE_SENTINEL_PRIVATE_KEY not found in .env");
    process.exit(1);
  }

  // Add 0x prefix if missing
  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;

  try {
    // Create wallet from private key
    const wallet = new ethers.Wallet(formattedKey);
    const derivedAddress = wallet.address;

    console.log("📋 Verification Results:");
    console.log("=" .repeat(80));
    console.log("Expected Address:", expectedAddress);
    console.log("Derived Address: ", derivedAddress);
    console.log("=" .repeat(80));

    // Check if addresses match
    if (derivedAddress.toLowerCase() === expectedAddress.toLowerCase()) {
      console.log("\n✅ SUCCESS: Private key matches Sentinel Vault address!");
      console.log("\n🎯 Sentinel Wallet Details:");
      console.log("   Address:", derivedAddress);
      console.log("   Network: Polygon Mainnet (Chain ID: 137)");
      console.log("\n🔗 View on Polygonscan:");
      console.log(`   https://polygonscan.com/address/${derivedAddress}`);
      
      // Check balance on Polygon
      console.log("\n💰 Checking MATIC balance...");
      const provider = new ethers.JsonRpcProvider(
        process.env.POLYGON_RPC_URL || "https://polygon-rpc.com"
      );
      
      try {
        const balance = await provider.getBalance(derivedAddress);
        const balanceInMatic = ethers.formatEther(balance);
        
        console.log(`   Balance: ${balanceInMatic} MATIC`);
        
        if (parseFloat(balanceInMatic) < 0.01) {
          console.log("\n⚠️  WARNING: Low MATIC balance!");
          console.log("   Sentinel needs MATIC for gas fees to mint VIDA tokens.");
          console.log("   Recommended: Send at least 0.1 MATIC to Sentinel Vault.");
        } else {
          console.log("\n✅ Sufficient MATIC balance for gas fees!");
        }
      } catch (error) {
        console.log("   ⚠️  Could not check balance (RPC error)");
      }

      console.log("\n" + "=" .repeat(80));
      console.log("✅ SENTINEL CONFIGURATION VERIFIED!");
      console.log("=" .repeat(80));
      console.log("\n🚀 Next Steps:");
      console.log("   1. Add environment variables to Netlify");
      console.log("   2. Deploy to production");
      console.log("   3. Test Four-Pillar verification");
      console.log("   4. Test Vitalization flow");
      console.log("   5. Verify VIDA minting on Polygonscan\n");

    } else {
      console.log("\n❌ ERROR: Private key does NOT match Sentinel Vault address!");
      console.log("\nExpected:", expectedAddress);
      console.log("Got:     ", derivedAddress);
      console.log("\n⚠️  Please verify the private key is correct.");
      process.exit(1);
    }

  } catch (error) {
    console.error("\n❌ ERROR: Invalid private key format!");
    console.error("Error:", error.message);
    console.log("\n💡 Make sure the private key is a valid 64-character hex string.");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  });

