# 🚀 DEPLOYMENT GUIDE - PHASE 1 SETUP

**Status**: In Progress  
**Goal**: Get Supabase + RSK + VIDA Token fully operational

---

## 📋 STEP 1: CREATE SUPABASE PROJECT (5 minutes)

### 1.1 Create Account & Project

1. **Go to Supabase**
   - Open: https://supabase.com
   - Click "Start your project" or "Sign In"
   - Sign up with GitHub (recommended) or email

2. **Create New Project**
   - Click "New Project"
   - Fill in:
     - **Name**: `pff-sentinel` (or your choice)
     - **Database Password**: Generate a strong password (SAVE THIS!)
     - **Region**: Choose closest to your users
     - **Pricing Plan**: Free tier is fine for testing
   - Click "Create new project"
   - ⏳ Wait 2-3 minutes for provisioning

3. **Get API Credentials**
   - Once project is ready, go to **Settings** (gear icon) → **API**
   - Copy these two values:
     - **Project URL**: `https://xxxxx.supabase.co`
     - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)

### 1.2 Configure Environment Variables

1. **Create `.env` file**
   ```bash
   # In your terminal (in PFF-Sentinel-Core directory)
   cp .env.example .env
   ```

2. **Edit `.env` file**
   - Open `.env` in your code editor
   - Replace the placeholder values:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # RSK Configuration (leave as testnet for now)
   VITE_RSK_NETWORK=testnet
   
   # VIDA Token (we'll fill this in Step 2)
   VITE_VIDA_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
   ```

### 1.3 Create Database Schema

1. **Open SQL Editor**
   - In Supabase dashboard, click **SQL Editor** (left sidebar)
   - Click "New query"

2. **Run this SQL**
   - Copy and paste the following:

```sql
-- Create profiles table for PFF Sentinel
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

-- Create indexes for performance
CREATE INDEX idx_profiles_device_uuid ON profiles(device_uuid);
CREATE INDEX idx_profiles_is_fully_verified ON profiles(is_fully_verified);
CREATE INDEX idx_profiles_vida_minted ON profiles(vida_minted);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

3. **Execute the query**
   - Click "Run" (or press Ctrl+Enter)
   - You should see: "Success. No rows returned"

4. **Verify table was created**
   - Click **Table Editor** (left sidebar)
   - You should see `profiles` table listed
   - Click on it to see the columns

### 1.4 Test Supabase Connection

1. **Start dev server**
   ```bash
   npm run dev
   ```

2. **Open browser console**
   - Open: `http://localhost:5173/index-four-pillar.html`
   - Press F12 to open DevTools
   - Go to Console tab

3. **Check for connection**
   - Look for: `🚀 PFF Sentinel Protocol v2.0 — Four-Pillar Anchor + Supabase + RSK`
   - If you see errors about Supabase, check your `.env` file

---

## ✅ STEP 1 CHECKLIST

- [ ] Supabase account created
- [ ] Project created and provisioned
- [ ] Project URL copied
- [ ] Anon key copied
- [ ] `.env` file created with credentials
- [ ] SQL schema executed successfully
- [ ] `profiles` table visible in Table Editor
- [ ] Dev server starts without Supabase errors

---

## 🔄 CURRENT STATUS

**Step 1**: ⏳ In Progress  
**Step 2**: ⏸️ Waiting (Deploy VIDA Token)  
**Step 3**: ⏸️ Waiting (End-to-End Testing)

---

## 📞 NEED HELP?

**Common Issues**:

1. **"Invalid API key" error**
   - Make sure you copied the **anon/public** key, not the service_role key
   - Check for extra spaces in `.env` file

2. **"Failed to fetch" error**
   - Check your Project URL is correct
   - Make sure project is fully provisioned (green status in dashboard)

3. **SQL execution failed**
   - Make sure you're in the SQL Editor, not the Table Editor
   - Try running each CREATE statement separately

---

**Once Step 1 is complete, let me know and we'll proceed to Step 2: Deploy VIDA Token!**

