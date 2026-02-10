# Phase 2 Testing Checklist

## ✅ Pre-Testing Setup

- [ ] Supabase Phase 2 schema deployed (`phase2-schema.sql`)
- [ ] Test data inserted with your wallet address (`phase2-test-data.sql`)
- [ ] Dev server running (`npm run dev`)
- [ ] MetaMask installed and connected to RSK Testnet

## 📊 Test 1: Earnings Dashboard

### Open Dashboard
1. Navigate to: `http://localhost:5173/earnings.html`
2. Click **"Connect Wallet"**
3. Approve MetaMask connection

### Expected Results:
- [ ] ✅ Wallet address displayed at top
- [ ] ✅ Hub Wallet section shows VIDA balance (may be 0.00 if no tokens)
- [ ] ✅ DLLR and USDT show 0.00 (placeholders until contracts deployed)

### Stats Grid Should Show:
- [ ] ✅ **Total Registrations**: 5
- [ ] ✅ **Active Subscriptions**: 5
- [ ] ✅ **Pending Earnings**: $90 (10+10+20+30+30)
- [ ] ✅ **Projected Monthly**: $90

### Charts Should Display:
- [ ] ✅ **Daily Verifications** chart populated with 30 days of data
- [ ] ✅ **Projected Monthly Revenue** chart showing bar graph
- [ ] ✅ Charts have dark theme with blue/purple colors

### Pending Earnings Table:
- [ ] ✅ Shows 5 rows of pending earnings
- [ ] ✅ Each row shows: Date, Citizen ID, Tier, Commission, VIDA Amount, Status
- [ ] ✅ All rows have "PENDING" status badge (yellow)
- [ ] ✅ **"Claim Earnings"** button is ENABLED (not grayed out)

### Subscription Breakdown Table:
- [ ] ✅ Basic: 2 subscriptions, $20 revenue
- [ ] ✅ Standard: 1 subscription, $20 revenue
- [ ] ✅ Premium: 1 subscription, $30 revenue
- [ ] ✅ Elite: 1 subscription, $30 revenue

### Test Claim Earnings:
1. Click **"Claim Earnings"** button
2. You should see an alert: "Successfully claimed 90 VIDA! Transaction: 0x..."
3. After clicking OK:
   - [ ] ✅ Pending Earnings table shows "No pending earnings"
   - [ ] ✅ Pending Earnings stat shows $0
   - [ ] ✅ "Claim Earnings" button is DISABLED

**Note**: This is a simulated claim. In production, it would trigger a real blockchain transaction.

## 💎 Test 2: Plans Page

### Open Plans Page
1. Navigate to: `http://localhost:5173/plans.html`
2. Click **"Connect Wallet"**
3. Approve MetaMask connection

### Expected Results:
- [ ] ✅ Wallet address displayed in wallet info section
- [ ] ✅ Device ID displayed (truncated)
- [ ] ✅ 4 plan cards visible: Basic, Standard, Premium, Elite

### Plan Cards Should Show:
- [ ] ✅ **Basic**: $100/month, Earn $10 commission
- [ ] ✅ **Standard**: $200/month, Earn $20 commission
- [ ] ✅ **Premium**: $500/month, Earn $30 commission (with "Popular" badge)
- [ ] ✅ **Elite**: $1000/month, Earn $30 commission

### Test Plan Selection:
1. Click **"Select Basic"** button
2. Confirm the popup
3. Expected:
   - [ ] ✅ Button changes to "Processing..."
   - [ ] ✅ After ~2 seconds, button changes to "Current Plan"
   - [ ] ✅ Button becomes disabled (grayed out)
   - [ ] ✅ Green "✓ Active" badge appears above button
   - [ ] ✅ Other plan buttons change to "Upgrade to [Tier]"

### Test Plan Upgrade:
1. Click **"Upgrade to Premium"** button
2. Confirm the popup
3. Expected:
   - [ ] ✅ Premium button becomes "Current Plan"
   - [ ] ✅ Basic button changes back to "Select Basic"
   - [ ] ✅ Green badge moves to Premium card

## 🔄 Test 3: Data Sync Between Pages

### Test Real-time Updates:
1. With both `earnings.html` and `plans.html` open in separate tabs
2. In `plans.html`, upgrade to a different plan
3. Switch to `earnings.html` tab and refresh
4. Expected:
   - [ ] ✅ Active Subscriptions count updates
   - [ ] ✅ Subscription breakdown reflects new plan
   - [ ] ✅ Projected Monthly revenue updates

## 🗄️ Test 4: Database Verification

### Check Supabase Tables:
1. Go to Supabase → Table Editor
2. Open **subscriptions** table
3. Expected:
   - [ ] ✅ See your test subscriptions (5 rows)
   - [ ] ✅ All have status = 'active'
   - [ ] ✅ sentinel_wallet_address matches your wallet

4. Open **sentinel_earnings** table
5. Expected:
   - [ ] ✅ See earnings records
   - [ ] ✅ After claiming, status changes from 'pending' to 'claimed'
   - [ ] ✅ claimed_at timestamp is populated

6. Open **verification_stats** table
7. Expected:
   - [ ] ✅ 30 rows of daily stats
   - [ ] ✅ Dates range from today back 30 days

## 🐛 Troubleshooting

### Issue: Dashboard shows all zeros
**Solution**: 
- Verify test data was inserted with YOUR wallet address
- Check browser console for errors
- Verify wallet is connected

### Issue: "Claim Earnings" button disabled
**Solution**:
- Check `sentinel_earnings` table has rows with status='pending'
- Verify sentinel_wallet_address matches your connected wallet
- Refresh the page

### Issue: Charts not showing
**Solution**:
- Check `verification_stats` table has data
- Open browser console and look for Chart.js errors
- Verify Chart.js was installed (`npm install chart.js`)

### Issue: Plan selection fails
**Solution**:
- Check browser console for errors
- Verify Supabase connection in `.env`
- Check that `profiles` table has test citizen records

### Issue: Token balances show "--"
**Solution**:
- This is normal if VIDA contract isn't deployed yet
- Update `.env` with real contract addresses
- For testing, balances showing 0.00 is expected

## ✅ Success Criteria

All tests pass if:
- [x] Earnings dashboard loads and displays test data
- [x] Charts render with 30 days of data
- [x] Claim earnings button works (simulated)
- [x] Plans page shows all 4 tiers
- [x] Plan selection creates subscription in database
- [x] Data syncs between pages
- [x] No console errors

## 📝 Next Steps After Testing

Once all tests pass:
1. **Deploy VIDA Token contract** to RSK Testnet
2. **Update `.env`** with real contract addresses
3. **Implement real payment flow** (replace simulated transactions)
4. **Add auto-refresh** to dashboard (every 30 seconds)
5. **Set up Supabase real-time subscriptions** for live updates

---

**Current Status**: Database deployed, ready for testing!

Run through this checklist and let me know which tests pass/fail.

