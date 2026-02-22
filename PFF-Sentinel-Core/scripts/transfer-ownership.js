/**
 * PFF Sentinel — Transfer VIDA Token Ownership
 * Transfers ownership from deployer to Sentinel wallet
 */

const hre = require("hardhat");
require("dotenv").config();

async function main() {
  console.log("🔄 Transferring VIDA Token ownership to Sentinel...\n");

  // Get network info
  const network = hre.network.name;
  console.log("🌐 Network:", network);

  // Get contract address from environment
  const vidaAddress = process.env.NEXT_PUBLIC_VIDA_TOKEN_ADDRESS || process.env.VITE_VIDA_TOKEN_ADDRESS;
  const sentinelAddress = process.env.VITE_SENTINEL_WALLET_ADDRESS || process.env.NEXT_PUBLIC_SENTINEL_WALLET_ADDRESS;

  if (!vidaAddress || vidaAddress === "0x0000000000000000000000000000000000000000") {
    console.error("❌ ERROR: VIDA Token address not configured!");
    console.log("   Set NEXT_PUBLIC_VIDA_TOKEN_ADDRESS in .env");
    process.exit(1);
  }

  if (!sentinelAddress || sentinelAddress === "0x0000000000000000000000000000000000000002") {
    console.error("❌ ERROR: Sentinel wallet address not configured!");
    console.log("   Set VITE_SENTINEL_WALLET_ADDRESS in .env");
    console.log("   Run: npx hardhat run scripts/generate-sentinel-wallet.js");
    process.exit(1);
  }

  console.log("📍 VIDA Token:", vidaAddress);
  console.log("🛡️  Sentinel Wallet:", sentinelAddress);

  // Get deployer (current owner)
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Current Owner:", await deployer.getAddress());

  // Get VIDA Token contract
  const VIDAToken = await hre.ethers.getContractFactory("VIDAToken");
  const vidaToken = VIDAToken.attach(vidaAddress);

  // Check current owner
  const currentOwner = await vidaToken.owner();
  console.log("🔍 Verified Current Owner:", currentOwner);

  if (currentOwner.toLowerCase() !== (await deployer.getAddress()).toLowerCase()) {
    console.error("❌ ERROR: You are not the current owner!");
    console.log("   Current owner:", currentOwner);
    console.log("   Your address:", await deployer.getAddress());
    process.exit(1);
  }

  // Transfer ownership
  console.log("\n📤 Transferring ownership...");
  const tx = await vidaToken.transferOwnership(sentinelAddress);
  console.log("⏳ Transaction sent:", tx.hash);

  await tx.wait();
  console.log("✅ Transaction confirmed!");

  // Verify new owner
  const newOwner = await vidaToken.owner();
  console.log("🔍 New Owner:", newOwner);

  if (newOwner.toLowerCase() === sentinelAddress.toLowerCase()) {
    console.log("\n" + "=".repeat(80));
    console.log("✅ OWNERSHIP TRANSFER SUCCESSFUL!");
    console.log("=".repeat(80));
    console.log("\n🛡️  Sentinel wallet is now the owner of VIDA Token");
    console.log("🔐 Only Sentinel can mint VIDA tokens now");
    console.log("\n" + "=".repeat(80) + "\n");
  } else {
    console.error("\n❌ ERROR: Ownership transfer failed!");
    console.log("Expected:", sentinelAddress);
    console.log("Got:", newOwner);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

