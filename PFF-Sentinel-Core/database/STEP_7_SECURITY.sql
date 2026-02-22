-- STEP 7: Enable Row Level Security
-- Run this after STEP 6

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

SELECT 'Row Level Security enabled successfully!' as status;

