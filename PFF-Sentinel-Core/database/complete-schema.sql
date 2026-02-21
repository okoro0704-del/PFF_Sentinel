-- PFF Sentinel Complete Database Schema
-- Phase 1 + Phase 2 Combined
-- Run this in Supabase SQL Editor to create all tables at once

-- ============================================
-- PHASE 1: PROFILES TABLE
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
  
  -- Wallet Address
  wallet_address TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_wallet ON profiles(wallet_address);
CREATE INDEX idx_profiles_verified ON profiles(is_fully_verified);
CREATE INDEX idx_profiles_vida_minted ON profiles(vida_minted);
CREATE INDEX idx_profiles_minting_status ON profiles(minting_status);

-- ============================================
-- PHASE 2: SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_device_id TEXT NOT NULL REFERENCES profiles(device_id),
  sentinel_wallet_address TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('basic', 'standard', 'premium', 'elite')),
  plan_amount NUMERIC NOT NULL CHECK (plan_amount IN (100, 200, 500, 1000)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  auto_debit_enabled BOOLEAN DEFAULT TRUE,
  next_billing_date TIMESTAMPTZ,
  last_payment_date TIMESTAMPTZ,
  total_paid NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_citizen ON subscriptions(citizen_device_id);
CREATE INDEX idx_subscriptions_sentinel ON subscriptions(sentinel_wallet_address);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- PHASE 2: SENTINEL_EARNINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sentinel_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sentinel_wallet_address TEXT NOT NULL,
  citizen_device_id TEXT NOT NULL REFERENCES profiles(device_id),
  subscription_id UUID REFERENCES subscriptions(id),
  commission_tier TEXT NOT NULL CHECK (commission_tier IN ('tier1', 'tier2', 'tier3')),
  commission_amount NUMERIC NOT NULL CHECK (commission_amount IN (10, 20, 30)),
  plan_amount NUMERIC NOT NULL,
  vida_amount NUMERIC NOT NULL,
  transaction_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'failed')),
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_earnings_sentinel ON sentinel_earnings(sentinel_wallet_address);
CREATE INDEX idx_earnings_status ON sentinel_earnings(status);
CREATE INDEX idx_earnings_created ON sentinel_earnings(created_at);

-- ============================================
-- PHASE 2: PAYMENT_TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id),
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount_usd NUMERIC NOT NULL,
  amount_vida NUMERIC NOT NULL,
  transaction_hash TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('subscription', 'commission', 'refund')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  block_number BIGINT,
  gas_used NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX idx_transactions_from ON payment_transactions(from_address);
CREATE INDEX idx_transactions_to ON payment_transactions(to_address);
CREATE INDEX idx_transactions_status ON payment_transactions(status);

-- ============================================
-- PHASE 2: VERIFICATION_STATS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS verification_stats (
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

CREATE INDEX idx_stats_sentinel ON verification_stats(sentinel_wallet_address);
CREATE INDEX idx_stats_date ON verification_stats(date);

-- ============================================
-- NATIONAL SWAP BRIDGE: national_blocks (reserve tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS national_blocks (
  country_code TEXT PRIMARY KEY,
  total_vida_reserved NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_national_blocks_country ON national_blocks(country_code);

-- ============================================
-- GAS DRIP: gas_drip_history (Automated Gas Drip tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS gas_drip_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  drip_month TEXT NOT NULL,
  amount_pol NUMERIC NOT NULL DEFAULT 0.001,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gas_drip_month ON gas_drip_history(drip_month);
CREATE INDEX IF NOT EXISTS idx_gas_drip_wallet_month ON gas_drip_history(wallet_address, drip_month);

-- ============================================
-- MASTER BACKEND: CONSENT_LOGS (Sentinel log stream)
-- ============================================
CREATE TABLE IF NOT EXISTS consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type TEXT NOT NULL CHECK (log_type IN ('consent', 'access_attempt')),
  source TEXT DEFAULT 'sentinel',
  device_id TEXT,
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consent_logs_type ON consent_logs(log_type);
CREATE INDEX idx_consent_logs_created ON consent_logs(created_at);
CREATE INDEX idx_consent_logs_device ON consent_logs(device_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_stats_updated_at BEFORE UPDATE ON verification_stats
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION get_commission_tier(plan_amount NUMERIC)
RETURNS TEXT AS $$
BEGIN
  CASE plan_amount
    WHEN 100 THEN RETURN 'tier1';
    WHEN 200 THEN RETURN 'tier2';
    WHEN 500 THEN RETURN 'tier3';
    WHEN 1000 THEN RETURN 'tier3';
    ELSE RETURN 'tier1';
  END CASE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_commission_amount(tier TEXT)
RETURNS NUMERIC AS $$
BEGIN
  CASE tier
    WHEN 'tier1' THEN RETURN 10;
    WHEN 'tier2' THEN RETURN 20;
    WHEN 'tier3' THEN RETURN 30;
    ELSE RETURN 10;
  END CASE;
END;
$$ LANGUAGE plpgsql;

