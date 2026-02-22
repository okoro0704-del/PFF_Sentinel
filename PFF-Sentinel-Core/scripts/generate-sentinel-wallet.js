/**
 * PFF Sentinel — Generate Sentinel Wallet
 * Creates a new Ethereum wallet for Sentinel operations
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔐 Generating Sentinel Wallet...\n");

  // Generate random wallet
  const wallet = ethers.Wallet.createRandom();

  console.log("✅ Sentinel Wallet Generated!\n");
  console.log("=" .repeat(80));
  console.log("🔑 PRIVATE KEY (KEEP SECRET!):");
  console.log("=" .repeat(80));
  console.log(wallet.privateKey);
  console.log("\n" + "=".repeat(80));
  console.log("📍 WALLET ADDRESS:");
  console.log("=" .repeat(80));
  console.log(wallet.address);
  console.log("\n" + "=".repeat(80));
  console.log("🌱 MNEMONIC PHRASE (BACKUP!):");
  console.log("=" .repeat(80));
  console.log(wallet.mnemonic.phrase);
  console.log("=" .repeat(80));

  // Save to file (encrypted)
  const walletInfo = {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase,
    createdAt: new Date().toISOString(),
    warning: "⚠️ KEEP THIS FILE SECURE! Never commit to git or share publicly!"
  };

  const walletPath = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(walletPath)) {
    fs.mkdirSync(walletPath, { recursive: true });
  }

  const filename = `sentinel-wallet-${Date.now()}.json`;
  const filepath = path.join(walletPath, filename);

  fs.writeFileSync(filepath, JSON.stringify(walletInfo, null, 2));

  console.log("\n💾 Wallet info saved to:", filepath);
  console.log("⚠️  IMPORTANT: Keep this file secure and never commit to git!\n");

  // Generate .env instructions
  console.log("=" .repeat(80));
  console.log("🎯 NEXT STEPS:");
  console.log("=" .repeat(80));
  console.log("\n1. Add to your .env file:\n");
  console.log(`   VITE_SENTINEL_PRIVATE_KEY=${wallet.privateKey}`);
  console.log(`   VITE_SENTINEL_WALLET_ADDRESS=${wallet.address}`);
  console.log(`   NEXT_PUBLIC_SENTINEL_WALLET_ADDRESS=${wallet.address}`);

  console.log("\n2. Add to Netlify environment variables:");
  console.log("   - Go to Netlify Dashboard → Site Settings → Environment Variables");
  console.log("   - Add VITE_SENTINEL_PRIVATE_KEY (keep secret!)");
  console.log("   - Add VITE_SENTINEL_WALLET_ADDRESS");

  console.log("\n3. Fund the Sentinel wallet with MATIC for gas:");
  console.log("   - Polygon Amoy Testnet: https://faucet.polygon.technology");
  console.log("   - Polygon Mainnet: Send MATIC to", wallet.address);

  console.log("\n4. Transfer VIDA Token ownership to Sentinel:");
  console.log("   - Run: npx hardhat run scripts/transfer-ownership.js --network polygonAmoy");

  console.log("\n" + "=".repeat(80));
  console.log("✅ SENTINEL WALLET READY!");
  console.log("=" .repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

