-- STEP 1: Create profiles table
-- Run this first

CREATE TABLE IF NOT EXISTS profiles (
  device_id TEXT PRIMARY KEY,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  device_uuid TEXT,
  face_hash TEXT,
  finger_hash TEXT,
  is_fully_verified BOOLEAN DEFAULT FALSE,
  vida_minted BOOLEAN DEFAULT FALSE,
  minting_status TEXT DEFAULT 'PENDING',
  vida_balance_spendable NUMERIC DEFAULT 0,
  vida_balance_locked NUMERIC DEFAULT 0,
  vitalization_signature TEXT,
  vitalization_id TEXT UNIQUE,
  vitalized_at TIMESTAMPTZ,
  vitalized_by TEXT,
  biometric_enforcement_enabled BOOLEAN DEFAULT FALSE,
  biometric_enforcement_activated_at TIMESTAMPTZ,
  biometric_enforcement_tier TEXT,
  vault_frozen BOOLEAN DEFAULT FALSE,
  vault_frozen_at TIMESTAMPTZ,
  vault_freeze_reason TEXT,
  vault_unfrozen_at TIMESTAMPTZ,
  vault_unfrozen_by TEXT,
  wallet_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verify table was created
SELECT
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'profiles'
    )
    THEN 'SUCCESS: Profiles table created!'
    ELSE 'ERROR: Profiles table NOT created'
  END as status;

