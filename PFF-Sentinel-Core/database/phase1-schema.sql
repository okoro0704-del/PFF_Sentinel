-- PFF Sentinel Phase 1: Core Database Schema
-- Run this FIRST before phase2-schema.sql

-- ============================================
-- PROFILES TABLE (Core Citizen Data)
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
  vida_balance_spendable NUMERIC DEFAULT 0,
  vida_balance_locked NUMERIC DEFAULT 0,
  
  -- Wallet Address
  wallet_address TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_wallet ON profiles(wallet_address);
CREATE INDEX idx_profiles_verified ON profiles(is_fully_verified);
CREATE INDEX idx_profiles_vida_minted ON profiles(vida_minted);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_timestamp 
BEFORE UPDATE ON profiles
FOR EACH ROW 
EXECUTE FUNCTION update_profiles_updated_at();

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the table was created
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

