/**
 * PFF Sentinel — Deploy ngnVIDA Token
 * Deploys the Nigerian Naira-pegged VIDA token to Polygon
 */

import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying ngnVIDA Token to Polygon...\n");
  console.log("=" .repeat(80));

  // Get network info
  const network = await hre.ethers.provider.getNetwork();
  console.log(`\n📡 Network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log(`\n👤 Deployer: ${deployer.address}`);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInMatic = hre.ethers.formatEther(balance);
  console.log(`💰 Balance: ${balanceInMatic} MATIC`);

  if (parseFloat(balanceInMatic) < 0.01) {
    console.error("\n❌ ERROR: Insufficient MATIC for deployment!");
    console.error(`   Current: ${balanceInMatic} MATIC`);
    console.error(`   Minimum: 0.01 MATIC`);
    console.error(`\n   Send MATIC to: ${deployer.address}`);
    process.exit(1);
  }

  console.log("\n" + "=" .repeat(80));
  console.log("\n📝 Deploying ngnVIDA Token Contract...");

  // Deploy ngnVIDA Token
  // Note: You'll need to create contracts/ngnVIDAToken.sol
  // For now, we'll use a simple ERC20 implementation
  
  const ngnVIDA = await hre.ethers.deployContract("VIDAToken", [
    "ngnVIDA",
    "ngnVIDA",
    hre.ethers.parseEther("1000000000") // 1 billion initial supply
  ]);

  await ngnVIDA.waitForDeployment();
  const ngnVidaAddress = await ngnVIDA.getAddress();

  console.log(`\n✅ ngnVIDA Token deployed to: ${ngnVidaAddress}`);
  console.log(`✅ Owner: ${deployer.address}`);
  console.log(`✅ Network: ${network.name}`);

  console.log("\n" + "=" .repeat(80));

  // Save deployment info
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    contractName: "ngnVIDA Token",
    address: ngnVidaAddress,
    deployer: deployer.address,
    network: network.name,
    chainId: Number(network.chainId),
    deployedAt: new Date().toISOString(),
    transactionHash: ngnVIDA.deploymentTransaction().hash,
    blockNumber: ngnVIDA.deploymentTransaction().blockNumber
  };

  const filename = `ngnvida-deployment-${network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\n📄 Deployment info saved to: ${filename}`);

  console.log("\n" + "=" .repeat(80));
  console.log("\n🔗 View on Polygonscan:");
  console.log(`   https://polygonscan.com/address/${ngnVidaAddress}`);

  console.log("\n" + "=" .repeat(80));
  console.log("\n📝 NEXT STEPS:");
  console.log("   1. Update .env with ngnVIDA address:");
  console.log(`      VITE_NGN_VIDA_ADDRESS=${ngnVidaAddress}`);
  console.log(`      NEXT_PUBLIC_NGN_VIDA_ADDRESS=${ngnVidaAddress}`);
  console.log("\n   2. Transfer ownership to Sentinel Vault:");
  console.log("      npx hardhat run scripts/transfer-ownership.js --network polygon");
  console.log("\n   3. Verify deployment:");
  console.log("      node scripts/verify-deployment.js");
  console.log("\n" + "=" .repeat(80) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });

