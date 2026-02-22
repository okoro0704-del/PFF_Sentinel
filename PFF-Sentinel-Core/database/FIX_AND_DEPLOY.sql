-- COMPLETE FIX AND DEPLOY
-- This will drop everything and start fresh
-- Run this ENTIRE file in one go

-- Drop all existing tables
DROP TABLE IF EXISTS biometric_mdm_profiles CASCADE;
DROP TABLE IF EXISTS sovereign_unlock_events CASCADE;
DROP TABLE IF EXISTS vault_freeze_alerts CASCADE;
DROP TABLE IF EXISTS biometric_failures CASCADE;
DROP TABLE IF EXISTS satellite_remote_commands CASCADE;
DROP TABLE IF EXISTS satellite_join_tokens CASCADE;
DROP TABLE IF EXISTS sentinel_devices CASCADE;
DROP TABLE IF EXISTS gas_drip_history CASCADE;
DROP TABLE IF EXISTS national_blocks CASCADE;
DROP TABLE IF EXISTS consent_logs CASCADE;
DROP TABLE IF EXISTS verification_stats CASCADE;
DROP TABLE IF EXISTS payment_transactions CASCADE;
DROP TABLE IF EXISTS sentinel_earnings CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table with ALL columns
CREATE TABLE profiles (
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

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_device_id TEXT NOT NULL REFERENCES profiles(device_id),
  sentinel_wallet_address TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  plan_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  auto_debit_enabled BOOLEAN DEFAULT TRUE,
  next_billing_date TIMESTAMPTZ,
  last_payment_date TIMESTAMPTZ,
  total_paid NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sentinel_earnings table
CREATE TABLE sentinel_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentinel_wallet_address TEXT NOT NULL,
  citizen_device_id TEXT NOT NULL REFERENCES profiles(device_id),
  subscription_id UUID REFERENCES subscriptions(id),
  commission_tier TEXT NOT NULL,
  commission_amount NUMERIC NOT NULL,
  plan_amount NUMERIC NOT NULL,
  vida_amount NUMERIC NOT NULL,
  transaction_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payment_transactions table
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount_usd NUMERIC NOT NULL,
  amount_vida NUMERIC NOT NULL,
  transaction_hash TEXT,
  transaction_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  block_number BIGINT,
  gas_used NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- Create verification_stats table
CREATE TABLE verification_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentinel_wallet_address TEXT NOT NULL,
  date DATE NOT NULL,
  total_verifications INT DEFAULT 0,
  successful_verifications INT DEFAULT 0,
  failed_verifications INT DEFAULT 0,
  total_earnings_usd NUMERIC DEFAULT 0,
  total_earnings_vida NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sentinel_wallet_address, date)
);

-- Create consent_logs table
CREATE TABLE consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type TEXT NOT NULL,
  source TEXT DEFAULT 'sentinel',
  device_id TEXT,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create national_blocks table
CREATE TABLE national_blocks (
  country_code TEXT PRIMARY KEY,
  total_vida_reserved NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create gas_drip_history table
CREATE TABLE gas_drip_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  drip_month TEXT NOT NULL,
  amount_pol NUMERIC NOT NULL DEFAULT 0.001,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sentinel_devices table
CREATE TABLE sentinel_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  owner_wallet_address TEXT NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  device_type TEXT DEFAULT 'mobile',
  device_model TEXT,
  device_os TEXT,
  device_os_version TEXT,
  status TEXT DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  lock_reason TEXT,
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  face_hash TEXT,
  finger_hash TEXT,
  join_token TEXT UNIQUE,
  join_token_expires_at TIMESTAMPTZ,
  join_token_used BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create satellite_join_tokens table
CREATE TABLE satellite_join_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  encrypted_payload TEXT NOT NULL,
  owner_device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  owner_wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_device_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create satellite_remote_commands table
CREATE TABLE satellite_remote_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_type TEXT NOT NULL,
  command_payload JSONB DEFAULT '{}',
  target_device_id TEXT NOT NULL REFERENCES sentinel_devices(device_id) ON DELETE CASCADE,
  issued_by_device_id TEXT NOT NULL REFERENCES profiles(device_id),
  issued_by_wallet_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create biometric_failures table
CREATE TABLE biometric_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_number INTEGER NOT NULL,
  failure_type TEXT DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vault_freeze_alerts table
CREATE TABLE vault_freeze_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  frozen_amount NUMERIC NOT NULL,
  freeze_reason TEXT NOT NULL,
  frozen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'ACTIVE',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sovereign_unlock_events table
CREATE TABLE sovereign_unlock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  unlocked_by TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlock_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create biometric_mdm_profiles table
CREATE TABLE biometric_mdm_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  profile_uuid TEXT NOT NULL,
  profile_type TEXT DEFAULT 'STRICT_BIOMETRIC',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'GENERATED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT 'All 15 tables created successfully!' as status;

