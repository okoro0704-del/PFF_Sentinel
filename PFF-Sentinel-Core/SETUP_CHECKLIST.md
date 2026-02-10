# 🚀 PFF SENTINEL PHASE 1 - SETUP CHECKLIST

**Status**: Phase 1 Implementation Complete - Ready for Configuration  
**Date**: 2026-02-05

---

## ✅ COMPLETED (By AI Agent)

- [x] Install dependencies (@supabase/supabase-js, ethers)
- [x] Create Supabase client (`js/supabase-client.js`)
- [x] Create RSK Web3 provider (`js/SovereignProvider.js`)
- [x] Create VIDA minting protocol (`js/MintingProtocol.js`)
- [x] Update handshake core with Supabase (`js/handshake-core-supabase.js`)
- [x] Update app with Four-Pillar sync (`js/app-supabase.js`)
- [x] Create clean UI without Voice (`index-four-pillar.html`)
- [x] Create VIDA Token smart contract (`contracts/VIDAToken.sol`)
- [x] Create environment variables template (`.env.example`)
- [x] Create documentation (`PHASE1_IMPLEMENTATION.md`, `PHASE1_SUMMARY.md`)

---

## 📋 TODO (User Action Required)

### Step 1: Configure Supabase (5 minutes)

- [ ] Go to https://supabase.com and create a new project
- [ ] Wait for project to be provisioned
- [ ] Go to Project Settings → API
- [ ] Copy the following:
  - Project URL (e.g., `https://abcdefgh.supabase.co`)
  - Anon/Public Key (starts with `eyJ...`)
- [ ] Copy `.env.example` to `.env`:
  ```bash
  cp .env.example .env
  ```
- [ ] Edit `.env` and paste your Supabase credentials:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- [ ] Go to Supabase SQL Editor
- [ ] Run the following SQL schema:

```sql
CREATE TABLE profiles (
  device_id TEXT PRIMARY KEY,
  face_geometry_hash TEXT,
  face_liveness_min NUMERIC,
  finger_ridge_match BOOLEAN,
  finger_credential_id TEXT,
  gps_latitude NUMERIC,
  gps_longitude NUMERIC,
  gps_accuracy NUMERIC,
  device_uuid TEXT,
  is_fully_verified BOOLEAN DEFAULT FALSE,
  vida_minted BOOLEAN DEFAULT FALSE,
  vida_balance_spendable NUMERIC DEFAULT 0,
  vida_balance_locked NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_device_uuid ON profiles(device_uuid);
CREATE INDEX idx_profiles_is_fully_verified ON profiles(is_fully_verified);
CREATE INDEX idx_profiles_vida_minted ON profiles(vida_minted);
```

- [ ] Verify table was created (check Table Editor)

---

### Step 2: Deploy VIDA Token Smart Contract (15 minutes)

**Option A: Using Remix IDE (Recommended for beginners)**

- [ ] Go to https://remix.ethereum.org
- [ ] Create new file: `VIDAToken.sol`
- [ ] Copy contents from `contracts/VIDAToken.sol`
- [ ] Install OpenZeppelin contracts:
  - Click "Plugin Manager" → Activate "Solidity Compiler"
  - Set compiler version to `0.8.20`
- [ ] Compile the contract (Ctrl+S or click Compile button)
- [ ] Install MetaMask browser extension if not already installed
- [ ] Add RSK Testnet to MetaMask:
  - Network Name: `RSK Testnet`
  - RPC URL: `https://public-node.testnet.rsk.co`
  - Chain ID: `31`
  - Currency Symbol: `tRBTC`
  - Block Explorer: `https://explorer.testnet.rsk.co`
- [ ] Get testnet RBTC from faucet: https://faucet.rsk.co
- [ ] In Remix, go to "Deploy & Run Transactions"
- [ ] Select Environment: "Injected Provider - MetaMask"
- [ ] Connect MetaMask
- [ ] Click "Deploy"
- [ ] Confirm transaction in MetaMask
- [ ] Wait for deployment confirmation
- [ ] Copy deployed contract address (e.g., `0x1234...`)
- [ ] Update `.env`:
  ```env
  VITE_VIDA_TOKEN_ADDRESS=0x1234567890abcdef1234567890abcdef12345678
  VITE_RSK_NETWORK=testnet
  ```
- [ ] Verify contract on RSK Explorer (optional but recommended)

**Option B: Using Hardhat (For advanced users)**

- [ ] Install Hardhat: `npm install --save-dev hardhat`
- [ ] Initialize Hardhat: `npx hardhat init`
- [ ] Install dependencies: `npm install --save-dev @openzeppelin/contracts`
- [ ] Copy `contracts/VIDAToken.sol` to `contracts/` folder
- [ ] Create deployment script in `scripts/deploy.js`
- [ ] Configure `hardhat.config.js` with RSK Testnet
- [ ] Deploy: `npx hardhat run scripts/deploy.js --network rskTestnet`
- [ ] Copy contract address to `.env`

---

### Step 3: Test the System (10 minutes)

- [ ] Start development server:
  ```bash
  npm run dev
  ```
- [ ] Open browser to: `http://localhost:5173/index-four-pillar.html`
- [ ] Open browser console (F12)
- [ ] Check for initialization message:
  ```
  🚀 PFF Sentinel Protocol v2.0 — Four-Pillar Anchor + Supabase + RSK
  🔐 Initializing Four-Pillar Anchors...
  ✅ Four-Pillar Anchors synced to Supabase
  ```
- [ ] Verify Protocol Hardware Status Bar shows:
  - GPS: Locked (green)
  - Device: Recognized (blue)
  - Face: Pending (yellow)
  - Finger: Pending (yellow)
- [ ] Click "Connect Wallet" button
- [ ] Connect MetaMask (should auto-switch to RSK Testnet)
- [ ] Click "Bind This Device"
- [ ] Click "Start Scan"
- [ ] Allow camera access
- [ ] Click "Enroll Template"
- [ ] Complete fingerprint prompt (browser WebAuthn)
- [ ] Check Supabase Table Editor - verify new row in `profiles` table
- [ ] Click "Verify Cohesion"
- [ ] If successful, check console for:
  ```
  ✅ FOUR-PILLAR VERIFIED!
  ✅ 5 VIDA CAP minted successfully: 0xabc123...
  ```
- [ ] Check MetaMask for transaction confirmation
- [ ] Check RSK Explorer for minting transaction
- [ ] Check Supabase - verify `vida_minted = TRUE`

---

## 🔍 Troubleshooting

### GPS Not Locking
- Enable location services in browser
- Allow location permission when prompted
- Check console for GPS errors

### Supabase Connection Failed
- Verify `.env` file exists and has correct values
- Check Supabase project is active
- Verify anon key is correct (starts with `eyJ`)

### Wallet Connection Failed
- Install MetaMask extension
- Make sure you're on RSK Testnet
- Check you have testnet RBTC for gas

### VIDA Minting Failed
- Verify contract address in `.env` is correct
- Check you have enough testnet RBTC for gas
- Verify you haven't already minted (check `vida_minted` in Supabase)

---

## 📊 Success Indicators

You'll know everything is working when:

1. ✅ Console shows "Four-Pillar Anchors synced to Supabase"
2. ✅ Status bar shows GPS: Locked, Device: Recognized
3. ✅ Enrollment creates row in Supabase `profiles` table
4. ✅ Verification shows "FOUR-PILLAR VERIFIED!"
5. ✅ MetaMask shows VIDA minting transaction
6. ✅ RSK Explorer shows confirmed transaction
7. ✅ Supabase shows `vida_minted = TRUE` and balances

---

## 📚 Documentation

- `PHASE1_IMPLEMENTATION.md` - Full technical documentation
- `PHASE1_SUMMARY.md` - Executive summary and architecture
- `SETUP_CHECKLIST.md` - This file
- `RED_ALERT_MISSING_FEATURES.md` - Known missing features (Phase 2+)

---

## 🎯 Next Phase

Once Phase 1 is tested and working, you can proceed to:

**Phase 2: Treasury & Plans System**
- Subscription tiers ($100, $250, $500, $1000)
- Payment processing (Stripe/PayPal/Crypto)
- Auto-debit functionality
- Plan upgrade/downgrade logic

---

**Last Updated**: 2026-02-05  
**Phase 1 Status**: ✅ COMPLETE - Ready for User Configuration

