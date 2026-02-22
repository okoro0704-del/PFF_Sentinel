/**
 * PFF Sentinel — Generate All Wallets
 * Creates 4 separate wallets for the PFF Sentinel system
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🔐 Generating PFF Sentinel Wallets...\n");
  console.log("=" .repeat(80));

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const wallets = [
    {
      name: "Deployer Wallet",
      filename: "deployer-wallet.json",
      description: "Temporary wallet for deploying contracts (needs MATIC for gas)"
    },
    {
      name: "Sentinel Vault",
      filename: "sentinel-wallet.json",
      description: "Admin wallet for minting VIDA and signing Vitalization proofs"
    },
    {
      name: "Foundation Vault",
      filename: "foundation-wallet.json",
      description: "Foundation treasury for protocol development"
    },
    {
      name: "National Treasury",
      filename: "treasury-wallet.json",
      description: "National treasury for sovereign operations"
    }
  ];

  const generatedWallets = [];

  for (const walletInfo of wallets) {
    console.log(`\n📝 Generating ${walletInfo.name}...`);
    
    // Generate random wallet
    const wallet = ethers.Wallet.createRandom();
    
    const walletData = {
      name: walletInfo.name,
      description: walletInfo.description,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase,
      network: "Polygon Mainnet",
      chainId: 137,
      generatedAt: new Date().toISOString()
    };

    // Save to file
    const filepath = path.join(deploymentsDir, walletInfo.filename);
    fs.writeFileSync(filepath, JSON.stringify(walletData, null, 2));

    console.log(`   ✅ Address: ${wallet.address}`);
    console.log(`   ✅ Saved to: ${walletInfo.filename}`);

    generatedWallets.push(walletData);
  }

  console.log("\n" + "=" .repeat(80));
  console.log("\n🎉 All Wallets Generated Successfully!\n");

  // Print summary
  console.log("📋 WALLET SUMMARY:");
  console.log("=" .repeat(80));
  
  generatedWallets.forEach((wallet, index) => {
    console.log(`\n${index + 1}. ${wallet.name}`);
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Purpose: ${wallet.description}`);
  });

  console.log("\n" + "=" .repeat(80));
  console.log("\n⚠️  IMPORTANT SECURITY NOTES:");
  console.log("   1. NEVER commit the deployments/ folder to git!");
  console.log("   2. Backup all private keys securely (password manager, hardware wallet)");
  console.log("   3. The Deployer Wallet is temporary - you can delete it after deployment");
  console.log("   4. The Sentinel Vault private key is CRITICAL - keep it very secure!");
  console.log("\n" + "=" .repeat(80));

  // Create .env template
  console.log("\n📝 Creating .env template...");
  
  const envTemplate = `
# ============================================
# PFF SENTINEL - WALLET CONFIGURATION
# Generated: ${new Date().toISOString()}
# ============================================

# Deployer Wallet (TEMPORARY - for deployment only)
DEPLOYER_PRIVATE_KEY=${generatedWallets[0].privateKey}
DEPLOYER_ADDRESS=${generatedWallets[0].address}

# Sentinel Vault (PERMANENT - admin operations)
VITE_SENTINEL_PRIVATE_KEY=${generatedWallets[1].privateKey}
VITE_SENTINEL_WALLET_ADDRESS=${generatedWallets[1].address}
NEXT_PUBLIC_SENTINEL_WALLET_ADDRESS=${generatedWallets[1].address}

# Foundation Vault (PERMANENT)
VITE_FOUNDATION_VAULT_ADDRESS=${generatedWallets[2].address}
NEXT_PUBLIC_FOUNDATION_VAULT_ADDRESS=${generatedWallets[2].address}

# National Treasury (PERMANENT)
VITE_NATIONAL_TREASURY_ADDRESS=${generatedWallets[3].address}
NEXT_PUBLIC_NATIONAL_TREASURY_ADDRESS=${generatedWallets[3].address}

# Contract Addresses (will be filled after deployment)
VITE_VIDA_TOKEN_ADDRESS=
NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=
VITE_NGN_VIDA_ADDRESS=
NEXT_PUBLIC_NGN_VIDA_ADDRESS=

# Network Configuration
VITE_POLYGON_NETWORK=polygon
NEXT_PUBLIC_POLYGON_NETWORK=polygon
POLYGON_RPC_URL=https://rpc.ankr.com/polygon

# Supabase (keep your existing values)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
`;

  const envPath = path.join(deploymentsDir, "wallet-config.env");
  fs.writeFileSync(envPath, envTemplate.trim());
  
  console.log(`   ✅ Template saved to: deployments/wallet-config.env`);
  console.log("\n" + "=" .repeat(80));

  console.log("\n🚀 NEXT STEPS:");
  console.log("   1. Fund the Deployer Wallet with 0.5 MATIC for gas fees");
  console.log(`      Address: ${generatedWallets[0].address}`);
  console.log("      Get MATIC: https://faucet.polygon.technology/ (testnet)");
  console.log("      Or buy on exchange and send to this address (mainnet)");
  console.log("\n   2. Check deployer balance:");
  console.log("      node scripts/check-deployer-balance.js");
  console.log("\n   3. Deploy VIDA Token:");
  console.log("      npx hardhat run scripts/deploy-vida.js --network polygon");
  console.log("\n" + "=" .repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error generating wallets:", error);
    process.exit(1);
  });

