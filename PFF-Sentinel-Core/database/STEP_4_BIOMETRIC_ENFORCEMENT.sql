-- STEP 4: Create biometric enforcement tables
-- Run this after STEP 3

CREATE TABLE IF NOT EXISTS biometric_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  failed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_number INTEGER NOT NULL,
  failure_type TEXT DEFAULT 'UNKNOWN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_freeze_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  frozen_amount NUMERIC NOT NULL,
  freeze_reason TEXT NOT NULL,
  frozen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'ACTIVE',
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sovereign_unlock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  unlocked_by TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlock_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS biometric_mdm_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES profiles(device_id) ON DELETE CASCADE,
  profile_uuid TEXT NOT NULL,
  profile_type TEXT DEFAULT 'STRICT_BIOMETRIC',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'GENERATED',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biometric_failures_device ON biometric_failures(device_id);
CREATE INDEX IF NOT EXISTS idx_vault_freeze_alerts_device ON vault_freeze_alerts(device_id);
CREATE INDEX IF NOT EXISTS idx_sovereign_unlock_events_device ON sovereign_unlock_events(device_id);
CREATE INDEX IF NOT EXISTS idx_biometric_mdm_profiles_device ON biometric_mdm_profiles(device_id);

SELECT 'Biometric enforcement tables created successfully!' as status;

