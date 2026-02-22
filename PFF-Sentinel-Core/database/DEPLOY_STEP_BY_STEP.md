# PFF SENTINEL - STEP-BY-STEP DATABASE DEPLOYMENT

## Problem Solved
The large SQL file was causing syntax errors. I've broken it into **7 small steps** that you run one at a time.

---

## DEPLOYMENT STEPS

### STEP 1: Profiles Table
**File**: `database/STEP_1_PROFILES.sql`

1. Open Supabase SQL Editor
2. Copy and paste `STEP_1_PROFILES.sql`
3. Click "Run"
4. Wait for: "Profiles table created successfully!"

---

### STEP 2: Subscription Tables
**File**: `database/STEP_2_SUBSCRIPTIONS.sql`

1. Copy and paste `STEP_2_SUBSCRIPTIONS.sql`
2. Click "Run"
3. Wait for: "Subscription tables created successfully!"

---

### STEP 3: Satellite Device Tables
**File**: `database/STEP_3_SATELLITE_DEVICES.sql`

1. Copy and paste `STEP_3_SATELLITE_DEVICES.sql`
2. Click "Run"
3. Wait for: "Satellite device tables created successfully!"

---

### STEP 4: Biometric Enforcement Tables
**File**: `database/STEP_4_BIOMETRIC_ENFORCEMENT.sql`

1. Copy and paste `STEP_4_BIOMETRIC_ENFORCEMENT.sql`
2. Click "Run"
3. Wait for: "Biometric enforcement tables created successfully!"

---

### STEP 5: Logging Tables
**File**: `database/STEP_5_LOGGING.sql`

1. Copy and paste `STEP_5_LOGGING.sql`
2. Click "Run"
3. Wait for: "Logging tables created successfully!"

---

### STEP 6: Functions and Triggers
**File**: `database/STEP_6_FUNCTIONS.sql`

1. Copy and paste `STEP_6_FUNCTIONS.sql`
2. Click "Run"
3. Wait for: "Functions and triggers created successfully!"

---

### STEP 7: Row Level Security
**File**: `database/STEP_7_SECURITY.sql`

1. Copy and paste `STEP_7_SECURITY.sql`
2. Click "Run"
3. Wait for: "Row Level Security enabled successfully!"

---

## VERIFY DEPLOYMENT

After completing all 7 steps, run this query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Output** (15 tables):
- biometric_failures
- biometric_mdm_profiles
- consent_logs
- gas_drip_history
- national_blocks
- payment_transactions
- profiles
- satellite_join_tokens
- satellite_remote_commands
- sentinel_devices
- sentinel_earnings
- sovereign_unlock_events
- subscriptions
- vault_freeze_alerts
- verification_stats

---

## VERIFY VITALIZATION FIELDS

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE 'vitalization%'
ORDER BY column_name;
```

**Expected Output**:
- vitalization_id | text
- vitalization_signature | text
- vitalized_at | timestamp with time zone
- vitalized_by | text

---

## DONE!

Once all 7 steps complete successfully, your database is ready!

Next steps:
1. Get Supabase credentials
2. Generate Sentinel private key
3. Update .env file
4. Deploy Netlify function

