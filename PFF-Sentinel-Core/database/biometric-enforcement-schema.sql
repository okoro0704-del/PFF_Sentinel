-- ============================================
-- PFF Sentinel — Biometric Enforcement Schema
-- Database tables for biometric-only authentication
-- ============================================

-- Add biometric enforcement columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS biometric_enforcement_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS biometric_enforcement_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS biometric_enforcement_tier TEXT,
ADD COLUMN IF NOT EXISTS vault_frozen BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vault_frozen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS vault_freeze_reason TEXT,
ADD COLUMN IF NOT EXISTS vault_unfrozen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS vault_unfrozen_by TEXT;

-- Create biometric_failures table
CREATE TABLE IF NOT EXISTS biometric_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_number INTEGER NOT NULL,
  failure_type TEXT CHECK (failure_type IN ('FACEID', 'FINGERPRINT', 'UNKNOWN')) DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vault_freeze_alerts table
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

-- Create sovereign_unlock_events table
CREATE TABLE IF NOT EXISTS sovereign_unlock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  unlocked_by TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlock_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create biometric_mdm_profiles table (track MDM profile deployments)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_biometric_failures_device ON biometric_failures(device_id);
CREATE INDEX IF NOT EXISTS idx_biometric_failures_wallet ON biometric_failures(wallet_address);
CREATE INDEX IF NOT EXISTS idx_biometric_failures_failed_at ON biometric_failures(failed_at);
CREATE INDEX IF NOT EXISTS idx_vault_freeze_alerts_device ON vault_freeze_alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_vault_freeze_alerts_status ON vault_freeze_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sovereign_unlock_events_device ON sovereign_unlock_events(device_id);
CREATE INDEX IF NOT EXISTS idx_biometric_mdm_profiles_device ON biometric_mdm_profiles(device_id);
CREATE INDEX IF NOT EXISTS idx_profiles_vault_frozen ON profiles(vault_frozen);
CREATE INDEX IF NOT EXISTS idx_profiles_biometric_enforcement ON profiles(biometric_enforcement_enabled);

-- Create trigger to auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- Create function to get failed attempts count
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

-- Create function to check if vault should be frozen
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

-- Create function to get vault freeze status
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

-- Create function to clean up old biometric failures (older than 7 days)
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

-- Add comments for documentation
COMMENT ON TABLE biometric_failures IS 'Tracks failed biometric authentication attempts';
COMMENT ON TABLE vault_freeze_alerts IS 'Alerts for SSS Vault freeze events due to biometric failures';
COMMENT ON TABLE sovereign_unlock_events IS 'Logs of Sovereign Unlock (un-brick) operations';
COMMENT ON TABLE biometric_mdm_profiles IS 'Tracks MDM profile deployments for biometric enforcement';

COMMENT ON COLUMN profiles.biometric_enforcement_enabled IS 'Whether strict biometric-only authentication is enabled';
COMMENT ON COLUMN profiles.vault_frozen IS 'Whether SSS Vault is frozen due to biometric failures';
COMMENT ON COLUMN profiles.vault_freeze_reason IS 'Reason for vault freeze (e.g., BIOMETRIC_FAILURE_DURESS)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Biometric Enforcement schema created successfully';
  RAISE NOTICE '📊 Tables: biometric_failures, vault_freeze_alerts, sovereign_unlock_events, biometric_mdm_profiles';
  RAISE NOTICE '🔧 Functions: get_failed_attempts_count, should_freeze_vault, get_vault_freeze_status, cleanup_old_biometric_failures';
END $$;

