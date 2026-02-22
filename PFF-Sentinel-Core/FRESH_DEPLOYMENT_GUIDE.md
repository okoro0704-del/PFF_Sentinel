# 🚀 PFF Sentinel — Fresh Contract Deployment Guide

**Date**: 2026-02-22  
**Network**: Polygon Mainnet  
**Goal**: Deploy all contracts with separate wallets

---

## 🎯 **WALLET ARCHITECTURE**

You need **5 separate wallets** for the PFF Sentinel system:

| Wallet | Purpose | Needs Private Key? |
|--------|---------|-------------------|
| **1. Deployer Wallet** | Deploy all contracts, pay gas fees | ✅ Yes (temporary) |
| **2. Sentinel Vault** | Admin operations, mint VIDA, sign Vitalization | ✅ Yes (permanent) |
| **3. Foundation Vault** | Hold foundation funds | ❌ No (just address) |
| **4. National Treasury** | Hold national reserves, collect fees | ❌ No (just address) |
| **5. Citizen Wallets** | User wallets (generated per user) | ✅ Yes (per user) |

---

## 📋 **STEP-BY-STEP DEPLOYMENT**

### **Phase 1: Generate Wallets** (5 minutes)

We'll generate 4 wallets:
1. Deployer Wallet (temporary - just for deployment)
2. Sentinel Vault (permanent - for admin operations)
3. Foundation Vault (permanent - for foundation funds)
4. National Treasury (permanent - for national reserves)

**Run this command:**

```bash
node scripts/generate-all-wallets.js
```

This will create:
- `deployments/deployer-wallet.json`
- `deployments/sentinel-wallet.json`
- `deployments/foundation-wallet.json`
- `deployments/treasury-wallet.json`

**⚠️ IMPORTANT**: Save all private keys securely! You'll need them later.

---

### **Phase 2: Fund Deployer Wallet** (2 minutes)

1. Open `deployments/deployer-wallet.json`
2. Copy the `address`
3. Send **0.5 MATIC** to this address (for gas fees)
4. Get MATIC from:
   - **Polygon Faucet**: https://faucet.polygon.technology/ (testnet only)
   - **Buy on Exchange**: Binance, Coinbase, etc. (mainnet)
   - **Bridge from Ethereum**: https://wallet.polygon.technology/

**Verify balance:**
```bash
node scripts/check-deployer-balance.js
```

---

### **Phase 3: Deploy VIDA Token** (5 minutes)

Deploy the VIDA CAP Token contract:

```bash
npx hardhat run scripts/deploy-vida.js --network polygon
```

**Expected Output:**
```
✅ VIDA Token deployed to: 0x...
✅ Owner: [Deployer Address]
✅ Deployment saved to: deployments/vida-token-deployment.json
```

**What this does:**
- Deploys VIDAToken.sol to Polygon Mainnet
- Sets deployer as temporary owner
- Saves deployment info

---

### **Phase 4: Deploy ngnVIDA Token** (5 minutes)

Deploy the Nigerian Naira-pegged token:

```bash
npx hardhat run scripts/deploy-ngnvida.js --network polygon
```

**Expected Output:**
```
✅ ngnVIDA Token deployed to: 0x...
✅ Owner: [Deployer Address]
```

---

### **Phase 5: Transfer Ownership to Sentinel** (2 minutes)

Transfer VIDA Token ownership from Deployer to Sentinel Vault:

```bash
npx hardhat run scripts/transfer-ownership.js --network polygon
```

**Expected Output:**
```
✅ Current owner: [Deployer Address]
✅ Transferring to: [Sentinel Address]
✅ New owner: [Sentinel Address]
```

**What this does:**
- Transfers VIDA Token ownership to Sentinel Vault
- Sentinel can now mint VIDA tokens
- Deployer loses admin rights

---

### **Phase 6: Update Configuration** (5 minutes)

Update `.env` with all deployed addresses:

```env
# Deployer (temporary - for deployment only)
DEPLOYER_PRIVATE_KEY=0x...

# Sentinel Vault (permanent - admin operations)
VITE_SENTINEL_PRIVATE_KEY=0x...
VITE_SENTINEL_WALLET_ADDRESS=0x...

# Foundation Vault (permanent)
VITE_FOUNDATION_VAULT_ADDRESS=0x...

# National Treasury (permanent)
VITE_NATIONAL_TREASURY_ADDRESS=0x...

# VIDA CAP Token (deployed)
VITE_VIDA_TOKEN_ADDRESS=0x...

# ngnVIDA Token (deployed)
VITE_NGN_VIDA_ADDRESS=0x...
```

---

### **Phase 7: Verify Deployment** (5 minutes)

Run verification script:

```bash
node scripts/verify-deployment.js
```

**Expected Output:**
```
✅ VIDA Token deployed at: 0x...
✅ VIDA Token owner: [Sentinel Address]
✅ ngnVIDA Token deployed at: 0x...
✅ Sentinel Vault: [Sentinel Address]
✅ Foundation Vault: [Foundation Address]
✅ National Treasury: [Treasury Address]
✅ All contracts verified!
```

---

### **Phase 8: Update Netlify** (5 minutes)

Add all environment variables to Netlify:

1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add all variables from `.env`
3. Deploy to production

---

## 🛠️ **DEPLOYMENT SCRIPTS**

I'll create these scripts for you:

1. ✅ `scripts/generate-all-wallets.js` - Generate all 4 wallets
2. ✅ `scripts/check-deployer-balance.js` - Check deployer MATIC balance
3. ✅ `scripts/deploy-vida.js` - Deploy VIDA Token (already exists, will update)
4. ✅ `scripts/deploy-ngnvida.js` - Deploy ngnVIDA Token (new)
5. ✅ `scripts/transfer-ownership.js` - Transfer ownership (already exists, will update)
6. ✅ `scripts/verify-deployment.js` - Verify all deployments (new)

---

## 📊 **EXPECTED FINAL STATE**

After deployment:

```
┌─────────────────────────────────────────────────────────────┐
│                    PFF Sentinel Protocol                    │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  VIDA Token  │    │ ngnVIDA Token│    │   Sentinel   │
│              │    │              │    │    Vault     │
│ Owner:       │    │ Owner:       │    │              │
│ Sentinel     │    │ Sentinel     │    │ (Admin)      │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Foundation  │    │   National   │    │   Citizens   │
│    Vault     │    │   Treasury   │    │   (Users)    │
│              │    │              │    │              │
│ (Receives    │    │ (Receives    │    │ (Receive     │
│  grants)     │    │  fees)       │    │  5 VIDA CAP) │
└──────────────┘    └──────────────┘    └──────────────┘
```

---

## ⏱️ **TOTAL TIME: ~30 MINUTES**

- Phase 1: Generate Wallets (5 min)
- Phase 2: Fund Deployer (2 min)
- Phase 3: Deploy VIDA (5 min)
- Phase 4: Deploy ngnVIDA (5 min)
- Phase 5: Transfer Ownership (2 min)
- Phase 6: Update Config (5 min)
- Phase 7: Verify (5 min)
- Phase 8: Netlify (5 min)

---

## 🎯 **READY TO START?**

I'll create all the deployment scripts now. Just say "create the scripts" and I'll generate:

1. `scripts/generate-all-wallets.js`
2. `scripts/check-deployer-balance.js`
3. `scripts/deploy-ngnvida.js`
4. `scripts/verify-deployment.js`

Then you can start the deployment process!

---

**🛡️ Let's deploy PFF Sentinel with proper wallet separation!**

