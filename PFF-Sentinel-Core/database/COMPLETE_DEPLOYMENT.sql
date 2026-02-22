-- ============================================
-- PFF SENTINEL — COMPLETE DATABASE DEPLOYMENT
-- ============================================
-- Run this ENTIRE file in Supabase SQL Editor
-- This includes ALL tables, indexes, triggers, and functions
-- ============================================

-- ============================================
-- PART 1: CORE PROFILES TABLE
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

  -- Vitalization (Sentinel Authorization) ✅
  vitalization_signature TEXT,
  vitalization_id TEXT UNIQUE,
  vitalized_at TIMESTAMPTZ,
  vitalized_by TEXT,

  -- Biometric Enforcement ✅
  biometric_enforcement_enabled BOOLEAN DEFAULT FALSE,
  biometric_enforcement_activated_at TIMESTAMPTZ,
  biometric_enforcement_tier TEXT,
  vault_frozen BOOLEAN DEFAULT FALSE,
  vault_frozen_at TIMESTAMPTZ,
  vault_freeze_reason TEXT,
  vault_unfrozen_at TIMESTAMPTZ,
  vault_unfrozen_by TEXT,

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
CREATE INDEX IF NOT EXISTS idx_profiles_vault_frozen ON profiles(vault_frozen);
CREATE INDEX IF NOT EXISTS idx_profiles_biometric_enforcement ON profiles(biometric_enforcement_enabled);

-- ============================================
-- PART 2: SUBSCRIPTIONS & EARNINGS
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

CREATE INDEX IF NOT EXISTS idx_subscriptions_citizen ON subscriptions(citizen_device_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_sentinel ON subscriptions(sentinel_wallet_address);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

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

CREATE INDEX IF NOT EXISTS idx_earnings_sentinel ON sentinel_earnings(sentinel_wallet_address);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON sentinel_earnings(status);
CREATE INDEX IF NOT EXISTS idx_earnings_created ON sentinel_earnings(created_at);

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

CREATE INDEX IF NOT EXISTS idx_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON payment_transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON payment_transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON payment_transactions(status);

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

CREATE INDEX IF NOT EXISTS idx_stats_sentinel ON verification_stats(sentinel_wallet_address);
CREATE INDEX IF NOT EXISTS idx_stats_date ON verification_stats(date);

-- ============================================
-- PART 3: LOGGING & MONITORING
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

CREATE INDEX IF NOT EXISTS idx_consent_logs_type ON consent_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_consent_logs_created ON consent_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_consent_logs_device ON consent_logs(device_id);

CREATE TABLE IF NOT EXISTS national_blocks (
  country_code TEXT PRIMARY KEY,
  total_vida_reserved NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_national_blocks_country ON national_blocks(country_code);

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
-- PART 4: SATELLITE DEVICE REGISTRY
-- ============================================
CREATE TABLE IF NOT EXISTS sentinel_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner Information
  owner_device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  owner_wallet_address TEXT NOT NULL,

  -- Device Information
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT NOT NULL,
  device_type TEXT CHECK (device_type IN ('mobile', 'desktop', 'tablet', 'watch', 'other')) DEFAULT 'mobile',
  device_model TEXT,
  device_os TEXT,
  device_os_version TEXT,

  -- Device Status
  status TEXT CHECK (status IN ('online', 'secured', 'threat_detected', 'offline', 'locked')) DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ,

  -- Security Status
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  lock_reason TEXT,

  -- Biometric Anchors (synced from device)
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  face_hash TEXT,
  finger_hash TEXT,

  -- Join Token (used during QR handshake)
  join_token TEXT UNIQUE,
  join_token_expires_at TIMESTAMPTZ,
  join_token_used BOOLEAN DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sentinel_devices_owner ON sentinel_devices(owner_device_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_devices_wallet ON sentinel_devices(owner_wallet_address);
CREATE INDEX IF NOT EXISTS idx_sentinel_devices_status ON sentinel_devices(status);
CREATE INDEX IF NOT EXISTS idx_sentinel_devices_device_id ON sentinel_devices(device_id);

CREATE TABLE IF NOT EXISTS satellite_join_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token Information
  token TEXT NOT NULL UNIQUE,
  encrypted_payload TEXT NOT NULL,

  -- Owner Information
  owner_device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  owner_wallet_address TEXT NOT NULL,

  -- Token Status
  status TEXT CHECK (status IN ('pending', 'used', 'expired', 'revoked')) DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_device_id TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_satellite_join_tokens_token ON satellite_join_tokens(token);
CREATE INDEX IF NOT EXISTS idx_satellite_join_tokens_owner ON satellite_join_tokens(owner_device_id);
CREATE INDEX IF NOT EXISTS idx_satellite_join_tokens_status ON satellite_join_tokens(status);

CREATE TABLE IF NOT EXISTS satellite_remote_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Command Information
  command_type TEXT CHECK (command_type IN ('force_lock', 'unlock', 'wipe', 'locate', 'vitalize', 'de_vitalize')) NOT NULL,
  command_payload JSONB DEFAULT '{}',

  -- Target Device
  target_device_id TEXT NOT NULL REFERENCES sentinel_devices(device_id) ON DELETE CASCADE,

  -- Issuer Information
  issued_by_device_id TEXT NOT NULL REFERENCES profiles(device_id),
  issued_by_wallet_address TEXT NOT NULL,

  -- Command Status
  status TEXT CHECK (status IN ('pending', 'sent', 'acknowledged', 'executed', 'failed')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_satellite_remote_commands_target ON satellite_remote_commands(target_device_id);
CREATE INDEX IF NOT EXISTS idx_satellite_remote_commands_issuer ON satellite_remote_commands(issued_by_device_id);
CREATE INDEX IF NOT EXISTS idx_satellite_remote_commands_status ON satellite_remote_commands(status);

-- ============================================
-- PART 5: BIOMETRIC ENFORCEMENT
-- ============================================
CREATE TABLE IF NOT EXISTS biometric_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_number INTEGER NOT NULL,
  failure_type TEXT CHECK (failure_type IN ('FACEID', 'FINGERPRINT', 'UNKNOWN')) DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biometric_failures_device ON biometric_failures(device_id);
CREATE INDEX IF NOT EXISTS idx_biometric_failures_wallet ON biometric_failures(wallet_address);
CREATE INDEX IF NOT EXISTS idx_biometric_failures_failed_at ON biometric_failures(failed_at);

CREATE TABLE IF NOT EXISTS vault_freeze_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  frozen_amount NUMERIC NOT NULL,
  freeze_reason TEXT NOT NULL,
  frozen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT CHECK (status IN ('ACTIVE', 'RESOLVED')) DEFAULT 'ACTIVE',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_freeze_alerts_device ON vault_freeze_alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_vault_freeze_alerts_status ON vault_freeze_alerts(status);

CREATE TABLE IF NOT EXISTS sovereign_unlock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  unlocked_by TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlock_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sovereign_unlock_events_device ON sovereign_unlock_events(device_id);

CREATE TABLE IF NOT EXISTS biometric_mdm_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  profile_uuid TEXT NOT NULL,
  profile_type TEXT DEFAULT 'STRICT_BIOMETRIC',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('GENERATED', 'DEPLOYED', 'ACTIVE', 'REMOVED')) DEFAULT 'GENERATED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biometric_mdm_profiles_device ON biometric_mdm_profiles(device_id);

-- ============================================
-- PART 6: TRIGGERS
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

CREATE TRIGGER update_sentinel_devices_updated_at BEFORE UPDATE ON sentinel_devices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 7: HELPER FUNCTIONS
-- ============================================

-- Commission tier calculation
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

-- Commission amount calculation
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

-- Expire old join tokens
CREATE OR REPLACE FUNCTION expire_old_join_tokens()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE satellite_join_tokens
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Get device fleet status
CREATE OR REPLACE FUNCTION get_fleet_status(user_device_id TEXT)
RETURNS TABLE(
  total_devices INTEGER,
  online_devices INTEGER,
  secured_devices INTEGER,
  threat_detected_devices INTEGER,
  offline_devices INTEGER,
  locked_devices INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_devices,
    COUNT(*) FILTER (WHERE status = 'online')::INTEGER AS online_devices,
    COUNT(*) FILTER (WHERE status = 'secured')::INTEGER AS secured_devices,
    COUNT(*) FILTER (WHERE status = 'threat_detected')::INTEGER AS threat_detected_devices,
    COUNT(*) FILTER (WHERE status = 'offline')::INTEGER AS offline_devices,
    COUNT(*) FILTER (WHERE is_locked = TRUE)::INTEGER AS locked_devices
  FROM sentinel_devices
  WHERE owner_device_id = user_device_id;
END;
$$ LANGUAGE plpgsql;

-- Get failed biometric attempts count
CREATE OR REPLACE FUNCTION get_failed_attempts_count(user_device_id TEXT, time_window_minutes INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM biometric_failures
  WHERE device_id = user_device_id
  AND failed_at >= NOW() - (time_window_minutes || ' minutes')::INTERVAL;

  RETURN attempt_count;
END;
$$ LANGUAGE plpgsql;

-- Check if vault should be frozen
CREATE OR REPLACE FUNCTION should_freeze_vault(user_device_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  failed_count INTEGER;
  max_attempts INTEGER := 3;
BEGIN
  failed_count := get_failed_attempts_count(user_device_id, 30);
  RETURN failed_count >= max_attempts;
END;
$$ LANGUAGE plpgsql;

-- Get vault freeze status
CREATE OR REPLACE FUNCTION get_vault_freeze_status(user_device_id TEXT)
RETURNS TABLE(
  is_frozen BOOLEAN,
  frozen_at TIMESTAMPTZ,
  freeze_reason TEXT,
  frozen_amount NUMERIC,
  minutes_frozen INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.vault_frozen,
    p.vault_frozen_at,
    p.vault_freeze_reason,
    p.vida_balance_locked,
    EXTRACT(EPOCH FROM (NOW() - p.vault_frozen_at)) / 60 AS minutes_frozen
  FROM profiles p
  WHERE p.device_id = user_device_id;
END;
$$ LANGUAGE plpgsql;

-- Clean up old biometric failures (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_biometric_failures()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM biometric_failures
  WHERE failed_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 8: ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentinel_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE national_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_drip_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentinel_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE satellite_join_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE satellite_remote_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_freeze_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sovereign_unlock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_mdm_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (Service role has full access)
DROP POLICY IF EXISTS "Service role full access" ON profiles;
CREATE POLICY "Service role full access" ON profiles FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON subscriptions;
CREATE POLICY "Service role full access" ON subscriptions FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON sentinel_earnings;
CREATE POLICY "Service role full access" ON sentinel_earnings FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON payment_transactions;
CREATE POLICY "Service role full access" ON payment_transactions FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON verification_stats;
CREATE POLICY "Service role full access" ON verification_stats FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON consent_logs;
CREATE POLICY "Service role full access" ON consent_logs FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON national_blocks;
CREATE POLICY "Service role full access" ON national_blocks FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON gas_drip_history;
CREATE POLICY "Service role full access" ON gas_drip_history FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON sentinel_devices;
CREATE POLICY "Service role full access" ON sentinel_devices FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON satellite_join_tokens;
CREATE POLICY "Service role full access" ON satellite_join_tokens FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON satellite_remote_commands;
CREATE POLICY "Service role full access" ON satellite_remote_commands FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON biometric_failures;
CREATE POLICY "Service role full access" ON biometric_failures FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON vault_freeze_alerts;
CREATE POLICY "Service role full access" ON vault_freeze_alerts FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON sovereign_unlock_events;
CREATE POLICY "Service role full access" ON sovereign_unlock_events FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access" ON biometric_mdm_profiles;
CREATE POLICY "Service role full access" ON biometric_mdm_profiles FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- DEPLOYMENT COMPLETE!
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ PFF SENTINEL DATABASE DEPLOYMENT COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 TABLES CREATED (15):';
  RAISE NOTICE '  1. profiles (with vitalization fields)';
  RAISE NOTICE '  2. subscriptions';
  RAISE NOTICE '  3. sentinel_earnings';
  RAISE NOTICE '  4. payment_transactions';
  RAISE NOTICE '  5. verification_stats';
  RAISE NOTICE '  6. consent_logs';
  RAISE NOTICE '  7. national_blocks';
  RAISE NOTICE '  8. gas_drip_history';
  RAISE NOTICE '  9. sentinel_devices';
  RAISE NOTICE '  10. satellite_join_tokens';
  RAISE NOTICE '  11. satellite_remote_commands';
  RAISE NOTICE '  12. biometric_failures';
  RAISE NOTICE '  13. vault_freeze_alerts';
  RAISE NOTICE '  14. sovereign_unlock_events';
  RAISE NOTICE '  15. biometric_mdm_profiles';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 FUNCTIONS CREATED (9):';
  RAISE NOTICE '  - get_commission_tier()';
  RAISE NOTICE '  - get_commission_amount()';
  RAISE NOTICE '  - expire_old_join_tokens()';
  RAISE NOTICE '  - get_fleet_status()';
  RAISE NOTICE '  - get_failed_attempts_count()';
  RAISE NOTICE '  - should_freeze_vault()';
  RAISE NOTICE '  - get_vault_freeze_status()';
  RAISE NOTICE '  - cleanup_old_biometric_failures()';
  RAISE NOTICE '  - update_updated_at_column()';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 ROW LEVEL SECURITY: ENABLED';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Ready for PFF Sentinel Protocol!';
END $$;

