# Phase 2: Sovereign Treasury & Sentinel Earnings

## 🎯 Overview

Phase 2 implements the complete subscription and earnings system for PFF Sentinel Protocol, enabling Sentinels to earn commissions from Citizen registrations and manage their treasury.

## ✅ Completed Components

### 1. **Staffing Dashboard** (`earnings.html`)
- Real-time earnings tracking with Chart.js analytics
- Hub Wallet showing VIDA, DLLR, and USDT balances
- Pending earnings table with claim functionality
- Subscription breakdown by tier
- Daily verifications and projected monthly revenue charts

### 2. **Subscription Tiers UI** (`plans.html`)
- Four plan tiers: Basic ($100), Standard ($200), Premium ($500), Elite ($1000)
- Commission structure: $10, $20, $30 based on tier
- Plan selection and upgrade flow
- Current plan indicator
- Wallet connection integration

### 3. **Auto-Debit Function** (`auto-debit.js`)
- VIDA token transfer from Citizen's spendable vault to Sentinel's wallet
- Commission calculation based on plan tier
- Transaction recording and status tracking
- Earning record creation for Sentinels

### 4. **Unified Wallet View** (Extended `SovereignProvider.js`)
- Multi-token support: VIDA, DLLR, USDT
- `getAllTokenBalances()` function for simultaneous balance queries
- Individual contract getters for each token
- Generic `getTokenBalance()` for any ERC-20 token

### 5. **Analytics with Chart.js**
- Daily Verifications line chart (30-day view)
- Projected Monthly Revenue bar chart
- Dark theme matching PFF design system
- Real-time data from Supabase `verification_stats` table

## 📊 Database Schema

### New Tables (Phase 2)

#### `subscriptions`
```sql
- id (UUID, PK)
- citizen_device_id (FK → profiles)
- sentinel_wallet_address
- plan_tier (basic|standard|premium|elite)
- plan_amount (100|200|500|1000)
- status (active|paused|cancelled)
- auto_debit_enabled (boolean)
- next_billing_date, last_payment_date
- total_paid
```

#### `sentinel_earnings`
```sql
- id (UUID, PK)
- sentinel_wallet_address
- citizen_device_id (FK → profiles)
- subscription_id (FK → subscriptions)
- commission_tier (tier1|tier2|tier3)
- commission_amount (10|20|30)
- plan_amount, vida_amount
- transaction_hash
- status (pending|claimed|failed)
- claimed_at
```

#### `payment_transactions`
```sql
- id (UUID, PK)
- subscription_id (FK → subscriptions)
- from_address, to_address
- amount_usd, amount_vida
- transaction_hash
- transaction_type (subscription|commission|refund)
- status (pending|confirmed|failed)
- block_number, gas_used
- confirmed_at
```

#### `verification_stats`
```sql
- id (UUID, PK)
- sentinel_wallet_address
- date (unique per sentinel)
- total_verifications, successful_verifications, failed_verifications
- total_earnings_usd, total_earnings_vida
```

## 🔧 Key Files

### Frontend
- **`earnings.html`** (313 lines) - Earnings dashboard UI
- **`plans.html`** (150 lines) - Plan selection UI

### JavaScript Modules
- **`js/earnings-dashboard.js`** (389 lines) - Dashboard logic with Chart.js
- **`js/plan-selector.js`** (150 lines) - Plan selection and subscription flow
- **`js/treasury-client.js`** (352 lines) - Supabase client for treasury operations
- **`js/auto-debit.js`** (150 lines) - Payment processing and commission calculation
- **`js/SovereignProvider.js`** (270 lines) - Extended with DLLR/USDT support

### Database
- **`database/phase2-schema.sql`** (150 lines) - Complete Phase 2 schema

## 💰 Commission Structure

| Plan Tier | Monthly Fee | Commission | Tier |
|-----------|-------------|------------|------|
| Basic     | $100        | $10        | tier1 |
| Standard  | $200        | $20        | tier2 |
| Premium   | $500        | $30        | tier3 |
| Elite     | $1000       | $30        | tier3 |

## 🔄 Subscription Flow

1. **Citizen selects plan** on `plans.html`
2. **Wallet connection** via MetaMask
3. **Plan selection** triggers `upsertSubscription()`
4. **Auto-debit** processes VIDA transfer from Citizen to Sentinel
5. **Commission calculated** based on plan tier
6. **Earning record created** in `sentinel_earnings` table
7. **Transaction recorded** in `payment_transactions` table
8. **Sentinel claims earnings** via `earnings.html` dashboard

## 📈 Analytics Features

### Daily Verifications Chart
- Line chart showing verification trends
- 30-day rolling window
- Data from `verification_stats` table

### Projected Monthly Revenue Chart
- Bar chart showing revenue projections
- Based on active subscriptions
- Calculates commission totals per tier

## 🚀 Setup Instructions

### 1. Run Database Schema
```sql
-- In Supabase SQL Editor
-- Run: database/phase2-schema.sql
```

### 2. Update Environment Variables
```bash
# Add to .env
VITE_DLLR_TOKEN_ADDRESS=0x...
VITE_USDT_TOKEN_ADDRESS=0x...
```

### 3. Deploy Token Contracts (Optional)
- DLLR Token (ERC-20)
- USDT Token (ERC-20 or use existing RSK USDT)

### 4. Test the Flow
1. Open `plans.html` and connect wallet
2. Select a plan tier
3. View earnings on `earnings.html`
4. Claim pending earnings

## 🔐 Security Considerations

- **Wallet signatures required** for all transactions
- **Spendable balance checks** before transfers
- **Transaction confirmation** before marking as complete
- **Status tracking** for all payments and earnings
- **Auto-debit can be disabled** per subscription

## 📝 API Functions

### Treasury Client (`treasury-client.js`)
```javascript
// Subscriptions
upsertSubscription(subscriptionData)
getSentinelSubscriptions(sentinelWalletAddress)
getSubscriptionCounts(sentinelWalletAddress)

// Earnings
recordEarning(earningData)
getPendingEarnings(sentinelWalletAddress)
markEarningsClaimed(earningIds, transactionHash)

// Analytics
getVerificationStats(sentinelWalletAddress, days)
updateDailyStats(sentinelWalletAddress, stats)
getProjectedMonthlyRevenue(sentinelWalletAddress)

// Transactions
recordTransaction(transactionData)
updateTransactionStatus(transactionId, status, details)
```

### Auto-Debit (`auto-debit.js`)
```javascript
processSubscriptionPayment(paymentData)
calculateCommission(planAmount)
processSubscriptionWithPayment(subscriptionData)
```

### Sovereign Provider (`SovereignProvider.js`)
```javascript
getAllTokenBalances(walletAddress)
getDllrContract()
getUsdtContract()
getTokenBalance(tokenAddress, walletAddress)
```

## 🎨 UI/UX Features

- **Dark theme** with blue/purple gradients
- **Responsive grid layouts** for all screen sizes
- **Hover effects** on cards and buttons
- **Real-time balance updates**
- **Status badges** for pending/claimed earnings
- **Chart.js visualizations** with custom styling

## 📦 Dependencies

- **Chart.js** - Analytics visualization
- **ethers.js** - Blockchain interaction
- **@supabase/supabase-js** - Database operations

## 🔮 Future Enhancements

- [ ] Real-time Supabase subscriptions for live updates
- [ ] Auto-refresh dashboard every 30 seconds
- [ ] Email notifications for new earnings
- [ ] Export earnings to CSV
- [ ] Multi-currency support (USD, EUR, etc.)
- [ ] Referral program tracking
- [ ] Advanced analytics (conversion rates, churn, etc.)

---

**Phase 2 Status**: ✅ **COMPLETE AND READY FOR TESTING**

All components implemented. Ready for Supabase schema deployment and end-to-end testing.

