# 🚀 PFF Sentinel — Quick Start Deployment

**Ready to deploy? Follow these steps in order!**

---

## ⚡ STEP 1: Generate Wallets (2 minutes)

```bash
node scripts/generate-all-wallets.js
```

**What this does:**
- Creates 4 wallets (Deployer, Sentinel, Foundation, Treasury)
- Saves them to `deployments/` folder
- Creates `.env` template with all addresses

**Output:**
- `deployments/deployer-wallet.json`
- `deployments/sentinel-wallet.json`
- `deployments/foundation-wallet.json`
- `deployments/treasury-wallet.json`
- `deployments/wallet-config.env`

---

## ⚡ STEP 2: Copy Configuration (1 minute)

```bash
# Copy the generated config to your .env file
# Open deployments/wallet-config.env and copy all values to your main .env file
```

**Or manually update `.env`:**
- Copy `DEPLOYER_PRIVATE_KEY` from `deployments/deployer-wallet.json`
- Copy `VITE_SENTINEL_PRIVATE_KEY` from `deployments/sentinel-wallet.json`
- Copy all addresses

---

## ⚡ STEP 3: Fund Deployer Wallet (2 minutes)

**Get the deployer address:**
```bash
# It's printed when you run generate-all-wallets.js
# Or check deployments/deployer-wallet.json
```

**Send 0.5 MATIC to the deployer address:**
- **Mainnet**: Buy MATIC on exchange, send to deployer address
- **Testnet**: Use faucet at https://faucet.polygon.technology/

**Verify balance:**
```bash
node scripts/check-deployer-balance.js
```

**Expected output:**
```
✅ EXCELLENT! You have enough MATIC for deployment.
   Balance: 0.5 MATIC
   Recommended: 0.5 MATIC
```

---

## ⚡ STEP 4: Deploy VIDA Token (3 minutes)

```bash
npx hardhat run scripts/deploy-vida.js --network polygon
```

**Expected output:**
```
✅ VIDA Token deployed to: 0x...
✅ Owner: [Deployer Address]
```

**Copy the contract address and update `.env`:**
```env
VITE_VIDA_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=0x...
```

---

## ⚡ STEP 5: Deploy ngnVIDA Token (3 minutes)

```bash
npx hardhat run scripts/deploy-ngnvida.js --network polygon
```

**Expected output:**
```
✅ ngnVIDA Token deployed to: 0x...
✅ Owner: [Deployer Address]
```

**Update `.env`:**
```env
VITE_NGN_VIDA_ADDRESS=0x...
NEXT_PUBLIC_NGN_VIDA_ADDRESS=0x...
```

---

## ⚡ STEP 6: Transfer Ownership (2 minutes)

```bash
npx hardhat run scripts/transfer-ownership.js --network polygon
```

**What this does:**
- Transfers VIDA Token ownership from Deployer to Sentinel
- Transfers ngnVIDA Token ownership from Deployer to Sentinel

**Expected output:**
```
✅ VIDA Token ownership transferred to Sentinel
✅ ngnVIDA Token ownership transferred to Sentinel
```

---

## ⚡ STEP 7: Verify Everything (1 minute)

```bash
node scripts/verify-deployment.js
```

**Expected output:**
```
🎉 ALL CHECKS PASSED! Deployment is complete and verified!

1. Network Connection          ✅ PASS
2. Sentinel Wallet             ✅ PASS
3. Foundation Vault            ✅ PASS
4. National Treasury           ✅ PASS
5. VIDA Token                  ✅ PASS
6. ngnVIDA Token               ✅ PASS
```

---

## ⚡ STEP 8: Update Netlify (5 minutes)

1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add all variables from your `.env` file
3. Deploy to production

**Required variables:**
```env
NEXT_PUBLIC_POLYGON_NETWORK=polygon
VITE_POLYGON_NETWORK=polygon

NEXT_PUBLIC_VIDA_TOKEN_ADDRESS=0x...
VITE_VIDA_TOKEN_ADDRESS=0x...

NEXT_PUBLIC_NGN_VIDA_ADDRESS=0x...
VITE_NGN_VIDA_ADDRESS=0x...

NEXT_PUBLIC_SENTINEL_WALLET_ADDRESS=0x...
VITE_SENTINEL_WALLET_ADDRESS=0x...
VITE_SENTINEL_PRIVATE_KEY=0x...

NEXT_PUBLIC_FOUNDATION_VAULT_ADDRESS=0x...
VITE_FOUNDATION_VAULT_ADDRESS=0x...

NEXT_PUBLIC_NATIONAL_TREASURY_ADDRESS=0x...
VITE_NATIONAL_TREASURY_ADDRESS=0x...

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## ⚡ STEP 9: Test (10 minutes)

1. Open your deployed site
2. Test Four-Pillar verification
3. Test Vitalization flow
4. Check Polygonscan for transactions
5. Verify database entries in Supabase

---

## 🎉 DONE!

**Total Time: ~30 minutes**

Your PFF Sentinel Protocol is now fully deployed on Polygon Mainnet with proper wallet separation!

---

## 📚 Reference

- **Full Guide**: `FRESH_DEPLOYMENT_GUIDE.md`
- **Wallet Files**: `deployments/` folder
- **Contract Addresses**: Check `.env` file
- **Polygonscan**: https://polygonscan.com/

---

## 🆘 Troubleshooting

**Problem: "Insufficient MATIC"**
- Solution: Send more MATIC to deployer address

**Problem: "Private key mismatch"**
- Solution: Make sure you copied the correct private key from `deployments/sentinel-wallet.json`

**Problem: "Contract deployment failed"**
- Solution: Check deployer has enough MATIC, try again

**Problem: "Ownership transfer failed"**
- Solution: Make sure VIDA Token is deployed first

---

**🛡️ Ready to deploy? Start with Step 1!**

