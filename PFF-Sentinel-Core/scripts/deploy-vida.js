/**
 * PFF Sentinel — VIDA Token Deployment Script
 * Deploys VIDAToken.sol to RSK Testnet or Mainnet
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Starting VIDA Token deployment...\n");

  // Get network info
  const network = hre.network.name;
  const chainId = hre.network.config.chainId;
  
  console.log("📡 Network:", network);
  console.log("🔗 Chain ID:", chainId);
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  
  console.log("👤 Deployer:", deployerAddress);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "MATIC\n");

  // Check if deployer has enough balance
  if (balance === 0n) {
    console.error("❌ ERROR: Deployer has no MATIC balance!");
    console.log("\n📝 To get testnet MATIC:");
    console.log("   Polygon Amoy Testnet:");
    console.log("   1. Go to https://faucet.polygon.technology");
    console.log("   2. Enter your address:", deployerAddress);
    console.log("   3. Request testnet MATIC\n");
    console.log("   Alternative faucets:");
    console.log("   - https://www.alchemy.com/faucets/polygon-amoy");
    console.log("   - https://www.quicknode.com/faucet/polygon\n");
    process.exit(1);
  }

  // Deploy VIDA Token
  console.log("📦 Deploying VIDAToken contract...");
  
  const VIDAToken = await hre.ethers.getContractFactory("VIDAToken");
  const vidaToken = await VIDAToken.deploy();
  
  await vidaToken.waitForDeployment();
  
  const vidaAddress = await vidaToken.getAddress();
  
  console.log("✅ VIDAToken deployed to:", vidaAddress);
  console.log("🔍 Transaction hash:", vidaToken.deploymentTransaction().hash);
  
  // Get token details
  const name = await vidaToken.name();
  const symbol = await vidaToken.symbol();
  const decimals = await vidaToken.decimals();
  const owner = await vidaToken.owner();
  
  console.log("\n📊 Token Details:");
  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals);
  console.log("   Owner:", owner);
  
  // Save deployment info
  const deploymentInfo = {
    network: network,
    chainId: chainId,
    contractAddress: vidaAddress,
    deployerAddress: deployerAddress,
    transactionHash: vidaToken.deploymentTransaction().hash,
    blockNumber: vidaToken.deploymentTransaction().blockNumber,
    timestamp: new Date().toISOString(),
    tokenDetails: {
      name: name,
      symbol: symbol,
      decimals: decimals,
      owner: owner
    }
  };
  
  const deploymentPath = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  const filename = `vida-token-${network}-${Date.now()}.json`;
  const filepath = path.join(deploymentPath, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n💾 Deployment info saved to:", filepath);
  
  // Generate .env update instructions
  console.log("\n" + "=".repeat(80));
  console.log("🎯 NEXT STEPS:");
  console.log("=".repeat(80));
  console.log("\n1. Update your .env file with:");
  console.log(`\n   NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=${vidaAddress}`);
  console.log(`   VITE_VIDA_TOKEN_ADDRESS=${vidaAddress}`);
  console.log(`   NEXT_PUBLIC_POLYGON_NETWORK=${network}`);
  console.log(`   VITE_POLYGON_NETWORK=${network}`);

  console.log("\n2. Update Netlify environment variables:");
  console.log("   - Go to Netlify Dashboard → Site Settings → Environment Variables");
  console.log("   - Add the variables above");

  console.log("\n3. Verify contract on Polygon Explorer (optional but recommended):");
  if (network === 'polygon') {
    console.log(`   https://polygonscan.com/address/${vidaAddress}`);
  } else if (network === 'polygonAmoy') {
    console.log(`   https://amoy.polygonscan.com/address/${vidaAddress}`);
  } else {
    console.log(`   https://mumbai.polygonscan.com/address/${vidaAddress}`);
  }

  console.log("\n4. Transfer ownership to Sentinel wallet (if needed):");
  console.log("   - Generate Sentinel wallet first");
  console.log("   - Run: npx hardhat run scripts/transfer-ownership.js --network", network);
  
  console.log("\n" + "=".repeat(80));
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("=".repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

