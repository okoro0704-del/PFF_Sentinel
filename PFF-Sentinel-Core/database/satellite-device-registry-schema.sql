-- ============================================
-- PFF Sentinel — Satellite Device Registry Schema
-- Multi-device management with QR handshake and remote commands
-- ============================================

-- Create sentinel_devices table
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

-- Create satellite_join_tokens table (temporary tokens for QR handshake)
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

-- Create satellite_remote_commands table (audit log for remote commands)
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sentinel_devices_owner ON sentinel_devices(owner_device_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_devices_wallet ON sentinel_devices(owner_wallet_address);
CREATE INDEX IF NOT EXISTS idx_sentinel_devices_status ON sentinel_devices(status);
CREATE INDEX IF NOT EXISTS idx_sentinel_devices_device_id ON sentinel_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_satellite_join_tokens_token ON satellite_join_tokens(token);
CREATE INDEX IF NOT EXISTS idx_satellite_join_tokens_owner ON satellite_join_tokens(owner_device_id);
CREATE INDEX IF NOT EXISTS idx_satellite_join_tokens_status ON satellite_join_tokens(status);
CREATE INDEX IF NOT EXISTS idx_satellite_remote_commands_target ON satellite_remote_commands(target_device_id);
CREATE INDEX IF NOT EXISTS idx_satellite_remote_commands_issuer ON satellite_remote_commands(issued_by_device_id);
CREATE INDEX IF NOT EXISTS idx_satellite_remote_commands_status ON satellite_remote_commands(status);

-- Create trigger to auto-update updated_at on sentinel_devices
CREATE OR REPLACE FUNCTION update_sentinel_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sentinel_devices_updated_at
BEFORE UPDATE ON sentinel_devices
FOR EACH ROW
EXECUTE FUNCTION update_sentinel_devices_updated_at();

-- Create function to expire old join tokens
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

-- Create function to get device fleet status
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

-- Add comments for documentation
COMMENT ON TABLE sentinel_devices IS 'Registry of all satellite devices linked to a Sovereign ID';
COMMENT ON TABLE satellite_join_tokens IS 'Temporary encrypted tokens for QR handshake device linking';
COMMENT ON TABLE satellite_remote_commands IS 'Audit log of all remote commands sent to satellite devices';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Satellite Device Registry schema created successfully';
  RAISE NOTICE '📊 Tables: sentinel_devices, satellite_join_tokens, satellite_remote_commands';
  RAISE NOTICE '🔧 Functions: expire_old_join_tokens, get_fleet_status';
END $$;

