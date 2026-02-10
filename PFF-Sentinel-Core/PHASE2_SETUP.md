# Phase 2 Setup Guide

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies ✅ DONE
Chart.js has already been installed via npm.

### Step 2: Deploy Database Schema (2 minutes)

1. Open your Supabase project: https://supabase.com
2. Go to **SQL Editor** (left sidebar)
3. Click **"New Query"**
4. Copy the entire contents of `database/phase2-schema.sql`
5. Paste into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. You should see: "Success. No rows returned"

**Verify Tables Created:**
```sql
-- Run this to verify all 4 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscriptions', 'sentinel_earnings', 'payment_transactions', 'verification_stats');
```

You should see 4 rows returned.

### Step 3: Update Environment Variables (1 minute)

Open your `.env` file and add the DLLR and USDT token addresses:

```bash
# Token Contract Addresses
VITE_VIDA_TOKEN_ADDRESS=0x... # Your deployed VIDA contract
VITE_DLLR_TOKEN_ADDRESS=0x... # Your DLLR contract (or use placeholder)
VITE_USDT_TOKEN_ADDRESS=0x... # RSK USDT contract (or use placeholder)
```

**Note**: If you don't have DLLR/USDT contracts yet, you can use placeholder addresses. The dashboard will show 0.00 balances until real contracts are deployed.

### Step 4: Test the Dashboard (2 minutes)

1. **Start your dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Open the Earnings Dashboard**:
   - Navigate to: `http://localhost:5173/earnings.html`
   - Click "Connect Wallet"
   - Connect your MetaMask wallet
   - You should see:
     - ✅ Wallet address displayed
     - ✅ Hub Wallet section with VIDA/DLLR/USDT balances
     - ✅ Stats grid (all zeros initially)
     - ✅ Two charts (empty initially)
     - ✅ Pending earnings table (empty initially)

3. **Open the Plans Page**:
   - Navigate to: `http://localhost:5173/plans.html`
   - Click "Connect Wallet"
   - You should see:
     - ✅ 4 plan cards (Basic, Standard, Premium, Elite)
     - ✅ "Select" buttons enabled
     - ✅ Wallet address displayed

## 🧪 Testing the Complete Flow

### Test 1: Create a Subscription

1. Go to `plans.html`
2. Connect your wallet
3. Click "Select Basic" (or any plan)
4. Confirm the transaction
5. You should see:
   - ✅ Success message
   - ✅ Button changes to "Current Plan"
   - ✅ Green "✓ Active" badge appears

### Test 2: View Earnings

1. Go to `earnings.html`
2. Connect your wallet
3. You should see:
   - ✅ "Active Subscriptions" count = 1
   - ✅ "Projected Monthly" = $10 (or $20/$30 depending on plan)
   - ✅ Subscription breakdown shows 1 in the selected tier

### Test 3: Claim Earnings (Simulated)

**Note**: This requires actual VIDA tokens and a real subscription payment flow. For now, you can test with sample data:

1. **Insert sample earning** in Supabase SQL Editor:
   ```sql
   INSERT INTO sentinel_earnings (
     sentinel_wallet_address,
     citizen_device_id,
     commission_tier,
     commission_amount,
     plan_amount,
     vida_amount,
     status
   ) VALUES (
     'YOUR_WALLET_ADDRESS',
     'test-device-123',
     'tier1',
     10,
     100,
     10,
     'pending'
   );
   ```

2. Refresh `earnings.html`
3. You should see:
   - ✅ "Pending Earnings" = $10
   - ✅ Earnings table shows 1 row
   - ✅ "Claim Earnings" button is enabled

4. Click "Claim Earnings"
5. You should see:
   - ✅ Success message with transaction hash
   - ✅ Earnings table clears
   - ✅ "Pending Earnings" = $0

## 📊 Adding Sample Analytics Data

To test the charts, add sample verification stats:

```sql
-- Insert 30 days of sample data
INSERT INTO verification_stats (sentinel_wallet_address, date, total_verifications, successful_verifications, total_earnings_usd, total_earnings_vida)
SELECT 
  'YOUR_WALLET_ADDRESS',
  CURRENT_DATE - (n || ' days')::interval,
  floor(random() * 50 + 10)::int,
  floor(random() * 45 + 10)::int,
  floor(random() * 100 + 20)::numeric,
  floor(random() * 100 + 20)::numeric
FROM generate_series(0, 29) n;
```

Refresh `earnings.html` and you should see populated charts!

## 🔧 Troubleshooting

### Issue: "No pending earnings" even after inserting data
**Solution**: Make sure the `sentinel_wallet_address` in the database matches your connected wallet address exactly (case-sensitive).

### Issue: Charts not showing
**Solution**: 
1. Check browser console for errors
2. Verify `verification_stats` table has data
3. Make sure wallet is connected

### Issue: "Claim Earnings" button disabled
**Solution**: 
1. Check that you have pending earnings in the database
2. Verify `status = 'pending'` in `sentinel_earnings` table
3. Refresh the page

### Issue: Token balances show 0.00
**Solution**:
1. Verify token contract addresses in `.env`
2. Check that contracts are deployed on RSK Testnet
3. Ensure your wallet has tokens

### Issue: Plan selection fails
**Solution**:
1. Check Supabase connection
2. Verify `subscriptions` table exists
3. Check browser console for errors

## 🎯 Next Steps

1. **Deploy DLLR and USDT contracts** (optional)
2. **Implement real payment flow** with VIDA transfers
3. **Add auto-refresh** to dashboard (every 30 seconds)
4. **Set up Supabase real-time subscriptions** for live updates
5. **Create admin panel** for managing subscriptions

## 📝 File Checklist

Phase 2 created/modified these files:

**New Files:**
- ✅ `database/phase2-schema.sql`
- ✅ `js/treasury-client.js`
- ✅ `js/auto-debit.js`
- ✅ `js/earnings-dashboard.js`
- ✅ `js/plan-selector.js`
- ✅ `earnings.html`
- ✅ `plans.html`
- ✅ `PHASE2_IMPLEMENTATION.md`
- ✅ `PHASE2_SETUP.md`

**Modified Files:**
- ✅ `js/SovereignProvider.js` (added DLLR/USDT support)
- ✅ `.env.example` (added DLLR/USDT addresses)

**Total**: 9 new files, 2 modified files, ~2,000 lines of code

---

**Ready to test?** Start with Step 2 (Deploy Database Schema) and work through the testing flow!

