-- ============================================
-- PFF Sentinel Database Deployment Script
-- WITH ROW LEVEL SECURITY (RLS)
-- ============================================
-- Run this in Supabase SQL Editor
-- This will:
-- 1. Create all tables
-- 2. Enable RLS
-- 3. Create basic policies
-- 4. Create verification queries
-- ============================================

-- Drop existing tables (CAUTION: This will delete all data!)
-- Uncomment the lines below if you want to start fresh
-- DROP TABLE IF EXISTS heartbeat CASCADE;
-- DROP TABLE IF EXISTS device_commands CASCADE;
-- DROP TABLE IF EXISTS sentinel_devices CASCADE;
-- DROP TABLE IF EXISTS access_attempts CASCADE;
-- DROP TABLE IF EXISTS consent_logs CASCADE;
-- DROP TABLE IF EXISTS subscriptions CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  device_id TEXT PRIMARY KEY,
  
  -- Four-Pillar Anchors
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  device_uuid TEXT,
  
  -- Biometric Hashes
  face_hash TEXT,
  finger_hash TEXT,
  
  -- Verification Status
  is_fully_verified BOOLEAN DEFAULT FALSE,
  
  -- VIDA Token Minting
  vida_minted BOOLEAN DEFAULT FALSE,
  minting_status TEXT DEFAULT 'PENDING' CHECK (minting_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  vida_balance_spendable NUMERIC DEFAULT 0,
  vida_balance_locked NUMERIC DEFAULT 0,

  -- Vitalization (Sentinel Authorization) ✅ NEW
  vitalization_signature TEXT,
  vitalization_id TEXT UNIQUE,
  vitalized_at TIMESTAMPTZ,
  vitalized_by TEXT,

  -- Wallet Address
  wallet_address TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(is_fully_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_vida_minted ON profiles(vida_minted);
CREATE INDEX IF NOT EXISTS idx_profiles_minting_status ON profiles(minting_status);
CREATE INDEX IF NOT EXISTS idx_profiles_vitalization_id ON profiles(vitalization_id);

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  device_id TEXT REFERENCES profiles(device_id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('Basic', 'Standard', 'Premium', 'Elite')),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CANCELLED')),
  monthly_fee NUMERIC NOT NULL,
  next_billing_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_device ON subscriptions(device_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- CONSENT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS consent_logs (
  id SERIAL PRIMARY KEY,
  device_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_device ON consent_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_consent_timestamp ON consent_logs(timestamp);

-- ============================================
-- ACCESS ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS access_attempts (
  id SERIAL PRIMARY KEY,
  device_id TEXT,
  message TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_device ON access_attempts(device_id);
CREATE INDEX IF NOT EXISTS idx_access_timestamp ON access_attempts(timestamp);

-- ============================================
-- SATELLITE DEVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sentinel_devices (
  id SERIAL PRIMARY KEY,
  sovereign_id TEXT NOT NULL,
  device_id TEXT UNIQUE NOT NULL,
  device_name TEXT,
  device_model TEXT,
  device_os TEXT,
  status TEXT DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'SECURED', 'THREAT_DETECTED', 'OFFLINE', 'LOCKED')),
  last_heartbeat TIMESTAMPTZ,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_devices_sovereign_id ON sentinel_devices(sovereign_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_devices_status ON sentinel_devices(status);

-- ============================================
-- DEVICE COMMANDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS device_commands (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  command TEXT NOT NULL CHECK (command IN ('FORCE_LOCK', 'UNLOCK', 'LOCATE', 'WIPE')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'EXECUTED', 'FAILED')),
  issued_by TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_device_commands_device_id ON device_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_device_commands_status ON device_commands(status);

-- ============================================
-- HEARTBEAT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS heartbeat (
  id SERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_heartbeat_device_id ON heartbeat(device_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_timestamp ON heartbeat(timestamp);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentinel_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeat ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Profiles: Service role has full access
DROP POLICY IF EXISTS "Service role full access" ON profiles;
CREATE POLICY "Service role full access" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Subscriptions: Service role has full access
DROP POLICY IF EXISTS "Service role full access" ON subscriptions;
CREATE POLICY "Service role full access" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Consent Logs: Service role has full access
DROP POLICY IF EXISTS "Service role full access" ON consent_logs;
CREATE POLICY "Service role full access" ON consent_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Access Attempts: Service role has full access
DROP POLICY IF EXISTS "Service role full access" ON access_attempts;
CREATE POLICY "Service role full access" ON access_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- Sentinel Devices: Service role has full access
DROP POLICY IF EXISTS "Service role full access" ON sentinel_devices;
CREATE POLICY "Service role full access" ON sentinel_devices
  FOR ALL USING (auth.role() = 'service_role');

-- Device Commands: Service role has full access
DROP POLICY IF EXISTS "Service role full access" ON device_commands;
CREATE POLICY "Service role full access" ON device_commands
  FOR ALL USING (auth.role() = 'service_role');

-- Heartbeat: Service role has full access
DROP POLICY IF EXISTS "Service role full access" ON heartbeat;
CREATE POLICY "Service role full access" ON heartbeat
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- DEPLOYMENT COMPLETE!
-- ============================================
-- Run the verification queries below to confirm deployment

-- Verification Query 1: List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verification Query 2: Check profiles table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Verification Query 3: Verify vitalization fields exist
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE 'vitalization%';

-- Expected output:
-- vitalization_signature
-- vitalization_id
-- vitalized_at
-- vitalized_by

