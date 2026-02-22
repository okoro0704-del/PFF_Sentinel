# 🗄️ PFF Sentinel — Database Deployment Guide

**Deployment Date**: 2026-02-22  
**Status**: ⚠️ **READY FOR DEPLOYMENT**

---

## 🎯 What This Deploys

This guide will help you deploy the **complete PFF Sentinel database schema** to Supabase, including:

- ✅ **Profiles Table** (Four-Pillar verification data)
- ✅ **Vitalization Fields** (Sentinel authorization tracking)
- ✅ **Subscriptions Table** (Guardian tier management)
- ✅ **Consent Logs Table** (Audit trail)
- ✅ **Access Attempts Table** (Security monitoring)
- ✅ **Satellite Devices Table** (Multi-device fleet)
- ✅ **Device Commands Table** (Remote device control)
- ✅ **Heartbeat Table** (Device health monitoring)

---

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ **Supabase Account** (free tier works)
- ✅ **Supabase Project** created
- ✅ **Database Access** (SQL Editor)

---

## 🚀 Deployment Steps

### **Step 1: Access Supabase SQL Editor**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

---

### **Step 2: Copy the Schema**

1. Open the file: `database/complete-schema.sql`
2. Copy **ALL** content (227 lines)
3. Paste into the Supabase SQL Editor

---

### **Step 3: Run the Schema**

1. Click **"Run"** button (or press `Ctrl+Enter`)
2. Wait for execution to complete
3. Check for success message: ✅ **"Success. No rows returned"**

---

### **Step 4: Verify Tables Created**

1. Click **"Table Editor"** in the left sidebar
2. You should see these tables:
   - ✅ `profiles`
   - ✅ `subscriptions`
   - ✅ `consent_logs`
   - ✅ `access_attempts`
   - ✅ `sentinel_devices`
   - ✅ `device_commands`
   - ✅ `heartbeat`

---

### **Step 5: Verify Vitalization Fields**

1. Click on **`profiles`** table
2. Scroll to the right
3. Verify these columns exist:
   - ✅ `vitalization_signature` (TEXT)
   - ✅ `vitalization_id` (TEXT, UNIQUE)
   - ✅ `vitalized_at` (TIMESTAMPTZ)
   - ✅ `vitalized_by` (TEXT)

---

## 🔍 Verification Queries

Run these queries to verify the deployment:

### **Query 1: Check All Tables**

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Output**:
```
access_attempts
consent_logs
device_commands
heartbeat
profiles
sentinel_devices
subscriptions
```

---

### **Query 2: Check Profiles Table Structure**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

**Expected Columns** (should include):
- `device_id` (PRIMARY KEY)
- `gps_lat`, `gps_lng`
- `device_uuid`
- `face_hash`, `finger_hash`
- `is_fully_verified`
- `vida_minted`, `minting_status`
- `vida_balance_spendable`, `vida_balance_locked`
- `vitalization_signature` ✅
- `vitalization_id` ✅
- `vitalized_at` ✅
- `vitalized_by` ✅
- `wallet_address`
- `created_at`, `updated_at`

---

### **Query 3: Check Indexes**

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

**Expected Indexes**:
- `idx_profiles_wallet`
- `idx_profiles_verified`
- `idx_profiles_vida_minted`
- `idx_profiles_minting_status`
- `idx_subscriptions_device`
- `idx_subscriptions_status`
- `idx_consent_device`
- `idx_access_device`
- `idx_sentinel_devices_sovereign_id`
- `idx_device_commands_device_id`
- `idx_heartbeat_device_id`

---

## 🛡️ Security Configuration

After deploying the schema, configure Row Level Security (RLS):

### **Enable RLS on All Tables**

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentinel_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeat ENABLE ROW LEVEL SECURITY;
```

### **Create Basic RLS Policies**

```sql
-- Allow service role to do everything
CREATE POLICY "Service role has full access" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON consent_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON access_attempts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON sentinel_devices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON device_commands
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access" ON heartbeat
  FOR ALL USING (auth.role() = 'service_role');
```

---

## 🧪 Test Data (Optional)

Insert test data to verify everything works:

```sql
-- Insert test profile
INSERT INTO profiles (
  device_id,
  device_uuid,
  gps_lat,
  gps_lng,
  face_hash,
  finger_hash,
  is_fully_verified,
  wallet_address
) VALUES (
  'test-device-001',
  'uuid-test-001',
  40.7128,
  -74.0060,
  'face-hash-test',
  'finger-hash-test',
  TRUE,
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
);

-- Verify insertion
SELECT * FROM profiles WHERE device_id = 'test-device-001';
```

---

## ✅ Deployment Checklist

- [ ] Supabase project created
- [ ] SQL Editor accessed
- [ ] `complete-schema.sql` copied and pasted
- [ ] Schema executed successfully
- [ ] All 7 tables created
- [ ] Vitalization fields verified in `profiles` table
- [ ] Indexes created
- [ ] RLS enabled (optional but recommended)
- [ ] RLS policies created (optional but recommended)
- [ ] Test data inserted (optional)

---

## 🚨 Troubleshooting

### **Error: "relation already exists"**

**Solution**: Tables already exist. You can either:
1. Drop existing tables: `DROP TABLE IF EXISTS profiles CASCADE;`
2. Or skip this error (tables are already created)

### **Error: "permission denied"**

**Solution**: Make sure you're using the correct Supabase project and have admin access.

### **Error: "syntax error"**

**Solution**: Make sure you copied the **entire** schema file, including all 227 lines.

---

## 📊 Post-Deployment Monitoring

After deployment, monitor these metrics:

### **Query 1: Profile Statistics**

```sql
SELECT 
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE is_fully_verified = TRUE) as verified_profiles,
  COUNT(*) FILTER (WHERE vida_minted = TRUE) as vitalized_profiles,
  SUM(vida_balance_spendable) as total_spendable_vida,
  SUM(vida_balance_locked) as total_locked_vida
FROM profiles;
```

### **Query 2: Vitalization Statistics**

```sql
SELECT 
  COUNT(*) as total_vitalizations,
  COUNT(DISTINCT vitalized_by) as unique_sentinels,
  MIN(vitalized_at) as first_vitalization,
  MAX(vitalized_at) as latest_vitalization
FROM profiles
WHERE vida_minted = TRUE;
```

### **Query 3: Recent Activity**

```sql
SELECT 
  device_id,
  wallet_address,
  is_fully_verified,
  vida_minted,
  vitalized_at,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎉 Success!

If all steps completed successfully, your database is ready for the PFF Sentinel Protocol!

**Next Steps**:
1. ✅ Configure environment variables (`.env`)
2. ✅ Generate Sentinel private key
3. ✅ Deploy Netlify functions
4. ✅ Test Four-Pillar verification
5. ✅ Test Vitalization flow

---

**END OF DATABASE DEPLOYMENT GUIDE**

