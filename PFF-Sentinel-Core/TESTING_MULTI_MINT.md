# 🧪 Testing Multi-Mint Vitalization System

**Quick guide to test the multi-mint Vitalization flow**

---

## 📋 PRE-FLIGHT CHECKLIST

Before testing, verify:

- [ ] Both tokens deployed and owned by Sentinel Safe
  - VIDA: `0xc226fFb538b6f80F05d5F0Ee0758E5D85a42DE0C`
  - ngnVIDA: `0xe814561AdB492f8ff3019194337A17E9cba9fEFd`
  - Owner: `0xBaF30D2fe8F8fb41F3053Ce68C4619A283B60211`

- [ ] All 3 Gnosis Safes deployed
  - Sentinel: `0xBaF30D2fe8F8fb41F3053Ce68C4619A283B60211`
  - Treasury: `0x4c81E768f4B201bCd7E924f671ABA1B162786b48`
  - Foundation: `0xDD8046422Bbeba12FD47DE854639abF7FB6E0858`

- [ ] Netlify environment variables updated
- [ ] Updated code deployed to Netlify
- [ ] Sentinel wallet has MATIC for gas fees

---

## 🚀 STEP-BY-STEP TESTING

### **STEP 1: Deploy Updated Code to Netlify**

1. **Update Netlify Environment Variables:**
   ```env
   VITE_VIDA_TOKEN_ADDRESS=0xc226fFb538b6f80F05d5F0Ee0758E5D85a42DE0C
   VITE_NGN_VIDA_ADDRESS=0xe814561AdB492f8ff3019194337A17E9cba9fEFd
   VITE_SENTINEL_WALLET_ADDRESS=0xBaF30D2fe8F8fb41F3053Ce68C4619A283B60211
   VITE_NATIONAL_TREASURY_ADDRESS=0x4c81E768f4B201bCd7E924f671ABA1B162786b48
   VITE_FOUNDATION_VAULT_ADDRESS=0xDD8046422Bbeba12FD47DE854639abF7FB6E0858
   VITE_SENTINEL_PRIVATE_KEY=0x773e8d0661b61e5c24da75d1f3cb854ec0dcbce8e4af3ad03b61043279a989e8
   VITE_POLYGON_NETWORK=polygon
   ```

2. **Deploy to Netlify:**
   - Push code to GitHub
   - Netlify auto-deploys
   - Or manually deploy via Netlify CLI

---

### **STEP 2: Complete Four-Pillar Verification**

1. Open your deployed site
2. Complete biometric verification:
   - ✅ GPS location
   - ✅ Device UUID binding
   - ✅ Face hash
   - ✅ Finger hash

3. Wait for "Fully Verified" status

---

### **STEP 3: Trigger Vitalization**

The Vitalization should trigger automatically after Four-Pillar verification.

**Watch the browser console for:**
```
🛡️ Four-Pillar verification complete. Requesting Vitalization from Sentinel...
🚀 Auto-Vitalization triggered
✅ VITALIZATION SUCCESSFUL!
🎉 5 VIDA CAP received
📜 Vitalization Proof ID: 0x...
```

---

### **STEP 4: Verify Multi-Mint on Polygonscan**

**Check User Wallet:**
1. Go to Polygonscan
2. Search for your user wallet address
3. Check VIDA token balance
4. Should show: 5 VIDA CAP

**Check National Treasury:**
1. Go to: https://polygonscan.com/address/0x4c81E768f4B201bCd7E924f671ABA1B162786b48
2. Click "Token Holdings"
3. Should show: 5 VIDA CAP

**Check Foundation Vault:**
1. Go to: https://polygonscan.com/address/0xDD8046422Bbeba12FD47DE854639abF7FB6E0858
2. Click "Token Holdings"
3. Should show: 1 VIDA CAP

---

### **STEP 5: Verify in Gnosis Safe Dashboard**

**National Treasury Safe:**
1. Go to: https://app.safe.global/home?safe=matic:0x4c81E768f4B201bCd7E924f671ABA1B162786b48
2. Check "Assets" tab
3. Should show: 5 VIDA tokens

**Foundation Vault Safe:**
1. Go to: https://app.safe.global/home?safe=matic:0xDD8046422Bbeba12FD47DE854639abF7FB6E0858
2. Check "Assets" tab
3. Should show: 1 VIDA token

---

### **STEP 6: Check Database**

1. Open Supabase Dashboard
2. Go to Table Editor → `profiles`
3. Find your profile by `device_id`
4. Verify:
   - `is_fully_verified` = true
   - `vida_minted` = true
   - `vida_balance_spendable` = 900
   - `vida_balance_locked` = 4000
   - `vitalization_signature` = (long hex string)
   - `vitalized_at` = (timestamp)

---

## 🔍 TROUBLESHOOTING

### **Issue: Vitalization fails with "Insufficient gas"**
**Solution:** Fund Sentinel wallet with more MATIC
- Send 0.5-1 MATIC to: `0xBaF30D2fe8F8fb41F3053Ce68C4619A283B60211`

### **Issue: "Sovereign Cap already minted"**
**Solution:** User already vitalized
- Check database: `vida_minted` = true
- Each user can only be vitalized once

### **Issue: "Not contract owner"**
**Solution:** Verify token ownership
- Check VIDA token owner: Should be Sentinel Safe
- Check ngnVIDA token owner: Should be Sentinel Safe

### **Issue: Multi-mint partially fails**
**Solution:** Check Netlify function logs
- One mint might succeed while others fail
- Check which transaction failed
- Verify gas limits and MATIC balance

---

## 📊 EXPECTED RESULTS

### **After 1 Vitalization:**

| Wallet | VIDA Balance | USD Value |
|--------|--------------|-----------|
| User Wallet | 5 VIDA CAP | $5,000 |
| National Treasury | 5 VIDA CAP | $5,000 |
| Foundation Vault | 1 VIDA CAP | $1,000 |

**Total Minted**: 11 VIDA CAP = $11,000

### **After 10 Vitalizations:**

| Wallet | VIDA Balance | USD Value |
|--------|--------------|-----------|
| All Users Combined | 50 VIDA CAP | $50,000 |
| National Treasury | 50 VIDA CAP | $50,000 |
| Foundation Vault | 10 VIDA CAP | $10,000 |

**Total Minted**: 110 VIDA CAP = $110,000

---

## ✅ SUCCESS CRITERIA

Your multi-mint system is working correctly if:

- ✅ User receives 5 VIDA CAP in their wallet
- ✅ National Treasury receives 5 VIDA CAP
- ✅ Foundation Vault receives 1 VIDA CAP
- ✅ All 3 transactions visible on Polygonscan
- ✅ Database updated with `vida_minted = true`
- ✅ Vitalization signature generated and stored

---

## 🎯 NEXT STEPS AFTER SUCCESSFUL TEST

1. **Add More Signers to Safes**
   - Add 2-3 trusted addresses
   - Change threshold to 2 of 3

2. **Execute Foundation → Sentinel Transfer**
   - Manually transfer $100 from Foundation to Sentinel
   - Via Gnosis Safe dashboard

3. **Monitor Accumulation**
   - Track total VIDA in each Safe
   - Monitor gas costs
   - Optimize if needed

4. **Production Launch**
   - Announce to users
   - Monitor first 10-20 Vitalizations
   - Scale up gradually

---

**🎉 Happy Testing!**

