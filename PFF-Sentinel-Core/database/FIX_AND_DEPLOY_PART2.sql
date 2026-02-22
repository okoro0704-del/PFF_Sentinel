-- PART 2: Functions and Security
-- Run this AFTER FIX_AND_DEPLOY.sql completes successfully

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_verification_stats_updated_at BEFORE UPDATE ON verification_stats
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sentinel_devices_updated_at BEFORE UPDATE ON sentinel_devices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper functions
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

-- Enable Row Level Security
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

-- Create RLS policies
CREATE POLICY "Service role full access" ON profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON sentinel_earnings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON payment_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON verification_stats FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON consent_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON national_blocks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON gas_drip_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON sentinel_devices FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON satellite_join_tokens FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON satellite_remote_commands FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON biometric_failures FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON vault_freeze_alerts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON sovereign_unlock_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON biometric_mdm_profiles FOR ALL USING (auth.role() = 'service_role');

SELECT 'DEPLOYMENT COMPLETE! All tables, functions, and security configured!' as status;

