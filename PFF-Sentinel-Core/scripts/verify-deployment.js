/**
 * PFF Sentinel — Verify Complete Deployment
 * Checks all contracts and wallets are properly configured
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
  console.log("🔍 Verifying PFF Sentinel Deployment...\n");
  console.log("=" .repeat(80));

  let allChecks = [];

  // Connect to Polygon
  const RPC_URL = process.env.POLYGON_RPC_URL || "https://polygon-pokt.nodies.app";
  console.log(`\n🔗 Connecting to Polygon: ${RPC_URL}`);
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  try {
    const network = await provider.getNetwork();
    console.log(`✅ Connected to: ${network.name} (Chain ID: ${network.chainId})`);
    allChecks.push({ name: "Network Connection", status: "✅ PASS" });
  } catch (error) {
    console.log(`❌ Failed to connect: ${error.message}`);
    allChecks.push({ name: "Network Connection", status: "❌ FAIL" });
  }

  console.log("\n" + "=" .repeat(80));

  // Check 1: Sentinel Wallet
  console.log("\n📋 1. SENTINEL VAULT");
  const sentinelAddress = process.env.VITE_SENTINEL_WALLET_ADDRESS;
  const sentinelPrivateKey = process.env.VITE_SENTINEL_PRIVATE_KEY;

  if (sentinelAddress && sentinelPrivateKey) {
    try {
      const wallet = new ethers.Wallet(sentinelPrivateKey);
      if (wallet.address.toLowerCase() === sentinelAddress.toLowerCase()) {
        console.log(`   ✅ Address: ${sentinelAddress}`);
        console.log(`   ✅ Private key matches address`);
        allChecks.push({ name: "Sentinel Wallet", status: "✅ PASS" });
      } else {
        console.log(`   ❌ Private key mismatch!`);
        console.log(`   Expected: ${sentinelAddress}`);
        console.log(`   Got: ${wallet.address}`);
        allChecks.push({ name: "Sentinel Wallet", status: "❌ FAIL" });
      }
    } catch (error) {
      console.log(`   ❌ Invalid private key: ${error.message}`);
      allChecks.push({ name: "Sentinel Wallet", status: "❌ FAIL" });
    }
  } else {
    console.log(`   ❌ Not configured in .env`);
    allChecks.push({ name: "Sentinel Wallet", status: "❌ FAIL" });
  }

  // Check 2: Foundation Vault
  console.log("\n📋 2. FOUNDATION VAULT");
  const foundationAddress = process.env.VITE_FOUNDATION_VAULT_ADDRESS;
  if (foundationAddress && foundationAddress !== "0x0000000000000000000000000000000000000000") {
    console.log(`   ✅ Address: ${foundationAddress}`);
    allChecks.push({ name: "Foundation Vault", status: "✅ PASS" });
  } else {
    console.log(`   ❌ Not configured`);
    allChecks.push({ name: "Foundation Vault", status: "❌ FAIL" });
  }

  // Check 3: National Treasury
  console.log("\n📋 3. NATIONAL TREASURY");
  const treasuryAddress = process.env.VITE_NATIONAL_TREASURY_ADDRESS;
  if (treasuryAddress && treasuryAddress !== "0x0000000000000000000000000000000000000000") {
    console.log(`   ✅ Address: ${treasuryAddress}`);
    allChecks.push({ name: "National Treasury", status: "✅ PASS" });
  } else {
    console.log(`   ❌ Not configured`);
    allChecks.push({ name: "National Treasury", status: "❌ FAIL" });
  }

  // Check 4: VIDA Token
  console.log("\n📋 4. VIDA CAP TOKEN");
  const vidaAddress = process.env.VITE_VIDA_TOKEN_ADDRESS;
  if (vidaAddress && vidaAddress !== "0x0000000000000000000000000000000000000000" && vidaAddress !== "") {
    console.log(`   ✅ Address: ${vidaAddress}`);

    // Check owner
    try {
      const vidaContract = new ethers.Contract(
        vidaAddress,
        ["function owner() view returns (address)"],
        provider
      );
      const owner = await vidaContract.owner();
      console.log(`   ✅ Owner: ${owner}`);

      if (owner.toLowerCase() === sentinelAddress?.toLowerCase()) {
        console.log(`   ✅ Owned by Sentinel Vault`);
        allChecks.push({ name: "VIDA Token", status: "✅ PASS" });
      } else if (owner.toLowerCase() === process.env.DEPLOYER_ADDRESS?.toLowerCase()) {
        console.log(`   ✅ Owned by Deployer Wallet (transfer to Sentinel when ready)`);
        allChecks.push({ name: "VIDA Token", status: "✅ PASS" });
      } else {
        console.log(`   ⚠️  Owner is: ${owner}`);
        allChecks.push({ name: "VIDA Token", status: "⚠️  WARNING" });
      }
    } catch (error) {
      console.log(`   ⚠️  Could not verify owner: ${error.message}`);
      allChecks.push({ name: "VIDA Token", status: "⚠️  WARNING" });
    }
  } else {
    console.log(`   ❌ Not deployed yet`);
    allChecks.push({ name: "VIDA Token", status: "❌ FAIL" });
  }

  // Check 5: ngnVIDA Token
  console.log("\n📋 5. ngnVIDA TOKEN");
  const ngnVidaAddress = process.env.VITE_NGN_VIDA_ADDRESS;
  if (ngnVidaAddress && ngnVidaAddress !== "0x0000000000000000000000000000000000000000" && ngnVidaAddress !== "") {
    console.log(`   ✅ Address: ${ngnVidaAddress}`);

    // Check owner
    try {
      const ngnVidaContract = new ethers.Contract(
        ngnVidaAddress,
        ["function owner() view returns (address)"],
        provider
      );
      const owner = await ngnVidaContract.owner();
      console.log(`   ✅ Owner: ${owner}`);
      allChecks.push({ name: "ngnVIDA Token", status: "✅ PASS" });
    } catch (error) {
      console.log(`   ⚠️  Could not verify owner: ${error.message}`);
      allChecks.push({ name: "ngnVIDA Token", status: "⚠️  WARNING" });
    }
  } else {
    console.log(`   ❌ Not deployed yet`);
    allChecks.push({ name: "ngnVIDA Token", status: "❌ FAIL" });
  }

  // Summary
  console.log("\n" + "=" .repeat(80));
  console.log("\n📊 VERIFICATION SUMMARY:");
  console.log("=" .repeat(80));

  allChecks.forEach((check, index) => {
    console.log(`${index + 1}. ${check.name.padEnd(30)} ${check.status}`);
  });

  const passed = allChecks.filter(c => c.status.includes("✅")).length;
  const failed = allChecks.filter(c => c.status.includes("❌")).length;
  const warnings = allChecks.filter(c => c.status.includes("⚠️")).length;

  console.log("\n" + "-".repeat(80));
  console.log(`Total Checks: ${allChecks.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Warnings: ${warnings}`);

  console.log("\n" + "=" .repeat(80));

  if (failed === 0 && warnings === 0) {
    console.log("\n🎉 ALL CHECKS PASSED! Deployment is complete and verified!");
    console.log("\n🚀 NEXT STEPS:");
    console.log("   1. Update Netlify environment variables");
    console.log("   2. Deploy to production");
    console.log("   3. Test Four-Pillar verification");
    console.log("   4. Test Vitalization flow");
  } else if (failed > 0) {
    console.log("\n❌ DEPLOYMENT INCOMPLETE!");
    console.log(`   ${failed} check(s) failed. Please fix the issues above.`);
  } else {
    console.log("\n⚠️  DEPLOYMENT COMPLETE WITH WARNINGS!");
    console.log(`   ${warnings} warning(s). Review the issues above.`);
  }

  console.log("\n" + "=" .repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  });

