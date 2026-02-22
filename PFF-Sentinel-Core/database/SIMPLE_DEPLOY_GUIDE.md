# SIMPLE 2-STEP DEPLOYMENT

## Problem Fixed
The previous files had issues. I've created 2 simple files that will work.

---

## STEP 1: Deploy Tables

**File**: `database/FIX_AND_DEPLOY.sql`

1. Open Supabase SQL Editor
2. Copy ALL content from `FIX_AND_DEPLOY.sql`
3. Paste into SQL Editor
4. Click "Run"
5. Wait for: **"All 15 tables created successfully!"**

This will:
- Drop any existing tables (clean slate)
- Create all 15 tables with correct columns
- Takes about 5 seconds

---

## STEP 2: Deploy Functions and Security

**File**: `database/FIX_AND_DEPLOY_PART2.sql`

1. Copy ALL content from `FIX_AND_DEPLOY_PART2.sql`
2. Paste into SQL Editor
3. Click "Run"
4. Wait for: **"DEPLOYMENT COMPLETE! All tables, functions, and security configured!"**

This will:
- Create helper functions
- Create triggers
- Enable Row Level Security
- Create RLS policies
- Takes about 3 seconds

---

## VERIFY DEPLOYMENT

After both steps complete, run this:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected**: 15 tables

```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE 'vitalization%';
```

**Expected**: 4 vitalization columns

---

## DONE!

Your database is ready for PFF Sentinel Protocol!

Next steps:
1. Get Supabase credentials
2. Generate Sentinel private key
3. Update .env file

