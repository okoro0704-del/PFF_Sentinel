# 🚀 VIDA Token Deployment Guide

**Project**: PFF Sentinel
**Contract**: VIDAToken.sol
**Network**: Polygon (Mainnet / Amoy Testnet)

---

## 📋 Prerequisites

Before deploying, ensure you have:

1. ✅ **Node.js** installed (v18 or higher)
2. ✅ **Hardhat** dependencies installed
3. ✅ **Deployer wallet** with MATIC for gas
4. ✅ **Environment variables** configured

---

## 🔧 Step 1: Install Dependencies

```bash
cd PFF-Sentinel-Core

# Install Hardhat and dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts dotenv

# Verify installation
npx hardhat --version
```

---

## 🔑 Step 2: Configure Environment Variables

Create or update `.env` file:

```env
# Deployer Private Key (wallet with MATIC for gas)
DEPLOYER_PRIVATE_KEY=0xYourDeployerPrivateKeyHere

# Network (polygon, polygonAmoy, or polygonMumbai)
NEXT_PUBLIC_POLYGON_NETWORK=polygonAmoy
VITE_POLYGON_NETWORK=polygonAmoy

# Polygon RPC URLs (optional - uses public RPCs by default)
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology

# These will be filled after deployment
NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=
VITE_VIDA_TOKEN_ADDRESS=

# These will be filled after generating Sentinel wallet
VITE_SENTINEL_PRIVATE_KEY=
VITE_SENTINEL_WALLET_ADDRESS=
NEXT_PUBLIC_SENTINEL_WALLET_ADDRESS=
```

**⚠️ IMPORTANT**: Never commit `.env` to git! Add it to `.gitignore`.

---

## 💰 Step 3: Fund Deployer Wallet

### For Polygon Amoy Testnet:
1. Go to https://faucet.polygon.technology
2. Select "Polygon Amoy" network
3. Enter your deployer wallet address
4. Request testnet MATIC
5. Wait for confirmation (~30 seconds)

**Alternative Testnet Faucets**:
- https://www.alchemy.com/faucets/polygon-amoy
- https://www.quicknode.com/faucet/polygon

### For Polygon Mainnet:
1. Send MATIC to your deployer wallet address
2. Minimum: ~0.1 MATIC for gas

---

## 🚀 Step 4: Deploy VIDA Token

```bash
# Deploy to Polygon Amoy Testnet
npx hardhat run scripts/deploy-vida.js --network polygonAmoy

# OR deploy to Polygon Mainnet
npx hardhat run scripts/deploy-vida.js --network polygon

# OR deploy to Polygon Mumbai (deprecated testnet)
npx hardhat run scripts/deploy-vida.js --network polygonMumbai
```

**Expected Output**:
```
🚀 Starting VIDA Token deployment...

📡 Network: polygonAmoy
🔗 Chain ID: 80002
👤 Deployer: 0x1234...
💰 Balance: 0.5 MATIC

📦 Deploying VIDAToken contract...
✅ VIDAToken deployed to: 0xABCD1234...
🔍 Transaction hash: 0x5678...

📊 Token Details:
   Name: VIDA Token
   Symbol: VIDA
   Decimals: 18
   Owner: 0x1234...

💾 Deployment info saved to: deployments/vida-token-polygonAmoy-1234567890.json

================================================================================
🎯 NEXT STEPS:
================================================================================

1. Update your .env file with:

   NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=0xABCD1234...
   VITE_VIDA_TOKEN_ADDRESS=0xABCD1234...
   NEXT_PUBLIC_POLYGON_NETWORK=polygonAmoy
   VITE_POLYGON_NETWORK=polygonAmoy

2. Update Netlify environment variables
3. Verify contract on Polygon Explorer
4. Transfer ownership to Sentinel wallet

================================================================================
✅ DEPLOYMENT COMPLETE!
================================================================================
```

---

## 🔐 Step 5: Generate Sentinel Wallet

```bash
npx hardhat run scripts/generate-sentinel-wallet.js
```

**Expected Output**:
```
🔐 Generating Sentinel Wallet...

✅ Sentinel Wallet Generated!

================================================================================
🔑 PRIVATE KEY (KEEP SECRET!):
================================================================================
0x9876543210abcdef...

================================================================================
📍 WALLET ADDRESS:
================================================================================
0xSENTINEL1234...

💾 Wallet info saved to: deployments/sentinel-wallet-1234567890.json
⚠️  IMPORTANT: Keep this file secure and never commit to git!

================================================================================
🎯 NEXT STEPS:
================================================================================

1. Add to your .env file:

   VITE_SENTINEL_PRIVATE_KEY=0x9876543210abcdef...
   VITE_SENTINEL_WALLET_ADDRESS=0xSENTINEL1234...
   NEXT_PUBLIC_SENTINEL_WALLET_ADDRESS=0xSENTINEL1234...

2. Add to Netlify environment variables
3. Fund the Sentinel wallet with RBTC for gas
4. Transfer VIDA Token ownership to Sentinel

================================================================================
✅ SENTINEL WALLET READY!
================================================================================
```

---

## 💸 Step 6: Fund Sentinel Wallet

The Sentinel wallet needs MATIC for gas to mint VIDA tokens.

### For Polygon Amoy Testnet:
```bash
# Go to https://faucet.polygon.technology
# Select "Polygon Amoy" network
# Enter Sentinel wallet address: 0xSENTINEL1234...
# Request testnet MATIC
```

### For Polygon Mainnet:
```bash
# Send MATIC to Sentinel wallet
# Recommended: 0.1 MATIC for gas
```

---

## 🔄 Step 7: Transfer Ownership to Sentinel

```bash
# Transfer VIDA Token ownership from deployer to Sentinel
npx hardhat run scripts/transfer-ownership.js --network polygonAmoy

# OR for mainnet
npx hardhat run scripts/transfer-ownership.js --network polygon
```

**Expected Output**:
```
🔄 Transferring VIDA Token ownership to Sentinel...

📍 VIDA Token: 0xABCD1234...
🛡️  Sentinel Wallet: 0xSENTINEL1234...
👤 Current Owner: 0x1234...
🔍 Verified Current Owner: 0x1234...

📤 Transferring ownership...
⏳ Transaction sent: 0x5678...
✅ Transaction confirmed!
🔍 New Owner: 0xSENTINEL1234...

================================================================================
✅ OWNERSHIP TRANSFER SUCCESSFUL!
================================================================================

🛡️  Sentinel wallet is now the owner of VIDA Token
🔐 Only Sentinel can mint VIDA tokens now

================================================================================
```

---

## 🌐 Step 8: Update Netlify Environment Variables

1. Go to **Netlify Dashboard**
2. Select your site
3. Go to **Site Settings** → **Environment Variables**
4. Add the following variables:

```
NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=0xABCD1234...
VITE_VIDA_TOKEN_ADDRESS=0xABCD1234...
NEXT_PUBLIC_POLYGON_NETWORK=polygonAmoy
VITE_POLYGON_NETWORK=polygonAmoy
VITE_SENTINEL_PRIVATE_KEY=0x9876543210abcdef...
VITE_SENTINEL_WALLET_ADDRESS=0xSENTINEL1234...
NEXT_PUBLIC_SENTINEL_WALLET_ADDRESS=0xSENTINEL1234...
```

5. Click **Save**
6. Redeploy your site

---

## ✅ Step 9: Verify Deployment

### Check Contract on Polygon Explorer

**Polygon Mainnet**:
```
https://polygonscan.com/address/0xABCD1234...
```

**Polygon Amoy Testnet**:
```
https://amoy.polygonscan.com/address/0xABCD1234...
```

**Polygon Mumbai Testnet** (deprecated):
```
https://mumbai.polygonscan.com/address/0xABCD1234...
```

### Test Minting (Optional)

You can test minting using Hardhat console:

```bash
npx hardhat console --network polygonAmoy
```

```javascript
const VIDAToken = await ethers.getContractFactory("VIDAToken");
const vida = VIDAToken.attach("0xABCD1234...");

// Check owner
await vida.owner(); // Should be Sentinel address

// Mint 5 VIDA CAP (from Sentinel wallet)
const spendable = ethers.parseEther("0.918"); // $900 / $980
const locked = ethers.parseEther("4.082"); // $4000 / $980
await vida.mintSovereignCap("0xCITIZEN...", spendable, locked);
```

---

## 🎉 Deployment Complete!

Your VIDA Token is now deployed and ready to use!

**What's Next**:
1. ✅ Test Four-Pillar verification
2. ✅ Test Vitalization flow
3. ✅ Test VIDA minting
4. ✅ Monitor transactions on RSK Explorer

---

## 🆘 Troubleshooting

### Error: "Deployer has no MATIC balance"
- **Solution**: Fund deployer wallet from faucet (testnet) or send MATIC (mainnet)

### Error: "VIDA Token address not configured"
- **Solution**: Update `.env` with deployed contract address

### Error: "You are not the current owner"
- **Solution**: Make sure you're using the deployer wallet that deployed the contract

### Error: "Transaction failed"
- **Solution**: Check gas price and MATIC balance

### Error: "Network not found"
- **Solution**: Make sure you're using the correct network name: `polygon`, `polygonAmoy`, or `polygonMumbai`

---

**🛡️ PFF Sentinel — VIDA Token Deployment Complete!**

