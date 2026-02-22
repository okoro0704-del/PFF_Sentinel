# 🚀 PFF SENTINEL — DATABASE DEPLOYMENT

## ⚡ QUICK START (2 MINUTES)

### **STEP 1: Open Supabase**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New Query"**

---

### **STEP 2: Copy & Paste**

**File to copy**: `database/COMPLETE_DEPLOYMENT.sql`

1. Open the file `database/COMPLETE_DEPLOYMENT.sql`
2. Select **ALL** content (603 lines)
3. Copy it (`Ctrl+A`, then `Ctrl+C`)
4. Paste into Supabase SQL Editor (`Ctrl+V`)

---

### **STEP 3: Run**

1. Click **"Run"** button (or press `Ctrl+Enter`)
2. Wait 5-10 seconds
3. Look for success message:

```
✅ PFF SENTINEL DATABASE DEPLOYMENT COMPLETE!

📊 TABLES CREATED (15):
  1. profiles (with vitalization fields)
  2. subscriptions
  3. sentinel_earnings
  4. payment_transactions
  5. verification_stats
  6. consent_logs
  7. national_blocks
  8. gas_drip_history
  9. sentinel_devices
  10. satellite_join_tokens
  11. satellite_remote_commands
  12. biometric_failures
  13. vault_freeze_alerts
  14. sovereign_unlock_events
  15. biometric_mdm_profiles

🔧 FUNCTIONS CREATED (9)
🔐 ROW LEVEL SECURITY: ENABLED
🎉 Ready for PFF Sentinel Protocol!
```

---

## ✅ VERIFY DEPLOYMENT

Run this query to verify all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Output** (15 tables):
```
✅ biometric_failures
✅ biometric_mdm_profiles
✅ consent_logs
✅ gas_drip_history
✅ national_blocks
✅ payment_transactions
✅ profiles
✅ satellite_join_tokens
✅ satellite_remote_commands
✅ sentinel_devices
✅ sentinel_earnings
✅ sovereign_unlock_events
✅ subscriptions
✅ vault_freeze_alerts
✅ verification_stats
```

---

## ✅ VERIFY VITALIZATION FIELDS

Run this query to verify vitalization fields exist:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE 'vitalization%'
ORDER BY column_name;
```

**Expected Output**:
```
✅ vitalization_id        | text
✅ vitalization_signature | text
✅ vitalized_at           | timestamp with time zone
✅ vitalized_by           | text
```

---

## 🎉 DONE!

Your database is now ready for the PFF Sentinel Protocol!

---

## 📋 WHAT WAS DEPLOYED

### **15 Tables**
- ✅ `profiles` — Four-Pillar verification + Vitalization + Biometric enforcement
- ✅ `subscriptions` — Guardian tier subscriptions
- ✅ `sentinel_earnings` — Sentinel commission tracking
- ✅ `payment_transactions` — Payment history
- ✅ `verification_stats` — Verification statistics
- ✅ `consent_logs` — Audit trail
- ✅ `national_blocks` — National VIDA reserves
- ✅ `gas_drip_history` — Gas drip tracking
- ✅ `sentinel_devices` — Satellite device registry
- ✅ `satellite_join_tokens` — QR handshake tokens
- ✅ `satellite_remote_commands` — Remote device commands
- ✅ `biometric_failures` — Failed biometric attempts
- ✅ `vault_freeze_alerts` — SSS vault freeze alerts
- ✅ `sovereign_unlock_events` — Unlock/un-brick events
- ✅ `biometric_mdm_profiles` — MDM profile deployments

### **9 Helper Functions**
- ✅ `get_commission_tier()` — Calculate commission tier
- ✅ `get_commission_amount()` — Calculate commission amount
- ✅ `expire_old_join_tokens()` — Clean up expired tokens
- ✅ `get_fleet_status()` — Get device fleet statistics
- ✅ `get_failed_attempts_count()` — Count failed biometric attempts
- ✅ `should_freeze_vault()` — Check if vault should freeze
- ✅ `get_vault_freeze_status()` — Get vault freeze details
- ✅ `cleanup_old_biometric_failures()` — Clean up old failures
- ✅ `update_updated_at_column()` — Auto-update timestamps

### **Security**
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Service role policies created
- ✅ Indexes created for performance

---

## 🚨 TROUBLESHOOTING

### **Error: "relation already exists"**
✅ **Solution**: Tables already created. You're good to go!

### **Error: "permission denied"**
❌ **Solution**: Make sure you're using the correct Supabase project with admin access

### **Error: "syntax error"**
❌ **Solution**: Make sure you copied the ENTIRE file (all 603 lines)

---

## 📊 NEXT STEPS

After database deployment:

### **1. Get Supabase Credentials**
In Supabase Dashboard → Settings → API:
- Copy `Project URL` → `VITE_SUPABASE_URL`
- Copy `anon public` key → `VITE_SUPABASE_ANON_KEY`
- Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### **2. Generate Sentinel Private Key**
Run in browser console:
```javascript
const wallet = ethers.Wallet.createRandom();
console.log('Sentinel Address:', wallet.address);
console.log('Sentinel Private Key:', wallet.privateKey);
```

### **3. Update `.env` File**
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Sentinel
VITE_SENTINEL_PRIVATE_KEY=0x...
VITE_SENTINEL_WALLET_ADDRESS=0x...
VITE_VITALIZATION_ENDPOINT=/.netlify/functions/vitalize-citizen
```

### **4. Deploy Netlify Function**
```bash
netlify deploy --prod
```

### **5. Test End-to-End**
1. Open `index-four-pillar.html`
2. Complete Four-Pillar verification
3. Check console for Vitalization success
4. Verify database entry

---

**🛡️ Database ready. Sentinel Engine ready. Let's vitalize some citizens!**

