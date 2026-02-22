/**
 * PFF Sentinel — Deploy VIDA Token (Direct with ethers.js)
 * Bypasses Hardhat to avoid Node.js version issues
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
  console.log("🚀 Deploying VIDA Token to Polygon Mainnet...\n");
  console.log("=".repeat(80));

  // Connect to Polygon
  const RPC_URL = process.env.POLYGON_RPC_URL || "https://polygon-bor-rpc.publicnode.com";
  console.log(`\n🔗 Connecting to: ${RPC_URL}`);
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  
  // Get network info
  const network = await provider.getNetwork();
  console.log(`✅ Connected to: Chain ID ${network.chainId}`);

  // Load deployer wallet
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!deployerPrivateKey) {
    console.error("\n❌ ERROR: DEPLOYER_PRIVATE_KEY not found in .env");
    process.exit(1);
  }

  const deployer = new ethers.Wallet(deployerPrivateKey, provider);
  console.log(`\n👤 Deployer: ${deployer.address}`);

  // Check balance
  const balance = await provider.getBalance(deployer.address);
  const balanceInMatic = ethers.formatEther(balance);
  console.log(`💰 Balance: ${balanceInMatic} MATIC`);

  if (parseFloat(balanceInMatic) < 0.01) {
    console.error("\n❌ ERROR: Insufficient MATIC for deployment!");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n📝 Compiling VIDA Token Contract...");

  // Read the compiled contract
  const contractPath = path.join(__dirname, "..", "artifacts", "contracts", "VIDAToken.sol", "VIDAToken.json");
  
  if (!fs.existsSync(contractPath)) {
    console.error("\n❌ ERROR: Contract not compiled!");
    console.error("   Run: npx hardhat compile");
    console.error("   Or check if VIDAToken.sol exists in contracts/");
    process.exit(1);
  }

  const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const abi = contractJson.abi;
  const bytecode = contractJson.bytecode;

  console.log("✅ Contract loaded");

  console.log("\n📤 Deploying VIDA Token...");
  console.log("   This may take 30-60 seconds...");

  // Create contract factory
  const VIDAToken = new ethers.ContractFactory(abi, bytecode, deployer);

  // Deploy
  const vidaToken = await VIDAToken.deploy();
  
  console.log("\n⏳ Waiting for deployment transaction to be mined...");
  await vidaToken.waitForDeployment();

  const vidaAddress = await vidaToken.getAddress();

  console.log("\n" + "=".repeat(80));
  console.log("\n🎉 VIDA TOKEN DEPLOYED SUCCESSFULLY!");
  console.log("\n✅ Contract Address: " + vidaAddress);
  console.log("✅ Owner: " + deployer.address);
  console.log("✅ Network: Polygon Mainnet (Chain ID: " + network.chainId + ")");

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    contractName: "VIDA Token",
    address: vidaAddress,
    deployer: deployer.address,
    network: "Polygon Mainnet",
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    transactionHash: vidaToken.deploymentTransaction().hash
  };

  const filename = `vida-deployment-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

  console.log("\n📄 Deployment info saved to: " + filename);

  console.log("\n" + "=".repeat(80));
  console.log("\n🔗 View on Polygonscan:");
  console.log("   https://polygonscan.com/address/" + vidaAddress);

  console.log("\n" + "=".repeat(80));
  console.log("\n📝 NEXT STEPS:");
  console.log("\n1. Update .env file:");
  console.log(`   VITE_VIDA_TOKEN_ADDRESS=${vidaAddress}`);
  console.log(`   NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=${vidaAddress}`);
  console.log("\n2. Deploy ngnVIDA Token:");
  console.log("   node scripts/deploy-ngnvida-direct.js");
  console.log("\n3. Transfer ownership to Sentinel:");
  console.log("   node scripts/transfer-ownership-direct.js");
  console.log("\n" + "=".repeat(80) + "\n");

  // Auto-update .env
  console.log("🔄 Auto-updating .env file...");
  const envPath = path.join(__dirname, "..", ".env");
  let envContent = fs.readFileSync(envPath, "utf8");
  
  envContent = envContent.replace(
    /VITE_VIDA_TOKEN_ADDRESS=.*/,
    `VITE_VIDA_TOKEN_ADDRESS=${vidaAddress}`
  );
  envContent = envContent.replace(
    /NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=.*/,
    `NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=${vidaAddress}`
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log("✅ .env file updated!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

