-- STEP 3: Create satellite device tables
-- Run this after STEP 2

CREATE TABLE IF NOT EXISTS sentinel_devices (
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

CREATE TABLE IF NOT EXISTS satellite_join_tokens (
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

CREATE TABLE IF NOT EXISTS satellite_remote_commands (
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

CREATE INDEX IF NOT EXISTS idx_sentinel_devices_owner ON sentinel_devices(owner_device_id);
CREATE INDEX IF NOT EXISTS idx_satellite_join_tokens_owner ON satellite_join_tokens(owner_device_id);
CREATE INDEX IF NOT EXISTS idx_satellite_remote_commands_target ON satellite_remote_commands(target_device_id);

SELECT 'Satellite device tables created successfully!' as status;

