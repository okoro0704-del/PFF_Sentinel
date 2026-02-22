-- STEP 6: Create helper functions and triggers
-- Run this after STEP 5

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

SELECT 'Functions and triggers created successfully!' as status;

