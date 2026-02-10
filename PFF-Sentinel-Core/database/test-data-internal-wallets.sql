-- PFF Sentinel Phase 2: Test Data
-- Using Internal PFF Wallets (No External MetaMask Needed)
-- Run this AFTER complete-schema.sql to populate sample data for testing

-- ============================================
-- SAMPLE PROFILES (Citizens + Sentinel)
-- ============================================
INSERT INTO profiles (device_id, gps_lat, gps_lng, device_uuid, is_fully_verified, wallet_address)
VALUES 
  ('test-citizen-001', 40.7128, -74.0060, 'device-uuid-001', TRUE, 'pff-wallet-001'),
  ('test-citizen-002', 34.0522, -118.2437, 'device-uuid-002', TRUE, 'pff-wallet-002'),
  ('test-citizen-003', 41.8781, -87.6298, 'device-uuid-003', TRUE, 'pff-wallet-003'),
  ('test-citizen-004', 29.7604, -95.3698, 'device-uuid-004', TRUE, 'pff-wallet-004'),
  ('test-citizen-005', 33.4484, -112.0740, 'device-uuid-005', TRUE, 'pff-wallet-005'),
  ('test-sentinel-001', 37.7749, -122.4194, 'sentinel-device-001', TRUE, 'pff-sentinel-wallet-001')
ON CONFLICT (device_id) DO NOTHING;

-- ============================================
-- SAMPLE SUBSCRIPTIONS
-- ============================================
INSERT INTO subscriptions (
  citizen_device_id, 
  sentinel_wallet_address, 
  plan_tier, 
  plan_amount,
  status,
  auto_debit_enabled,
  next_billing_date,
  last_payment_date,
  total_paid
)
VALUES 
  -- Basic Plan Subscriptions
  ('test-citizen-001', 'pff-sentinel-wallet-001', 'basic', 100, 'active', TRUE, NOW() + INTERVAL '30 days', NOW(), 100),
  ('test-citizen-002', 'pff-sentinel-wallet-001', 'basic', 100, 'active', TRUE, NOW() + INTERVAL '25 days', NOW() - INTERVAL '5 days', 100),
  
  -- Standard Plan Subscriptions
  ('test-citizen-003', 'pff-sentinel-wallet-001', 'standard', 200, 'active', TRUE, NOW() + INTERVAL '28 days', NOW() - INTERVAL '2 days', 200),
  
  -- Premium Plan Subscriptions
  ('test-citizen-004', 'pff-sentinel-wallet-001', 'premium', 500, 'active', TRUE, NOW() + INTERVAL '20 days', NOW() - INTERVAL '10 days', 500),
  
  -- Elite Plan Subscription
  ('test-citizen-005', 'pff-sentinel-wallet-001', 'elite', 1000, 'active', TRUE, NOW() + INTERVAL '15 days', NOW() - INTERVAL '15 days', 1000);

-- ============================================
-- SAMPLE EARNINGS (Pending)
-- ============================================
INSERT INTO sentinel_earnings (
  sentinel_wallet_address,
  citizen_device_id,
  subscription_id,
  commission_tier,
  commission_amount,
  plan_amount,
  vida_amount,
  status
)
SELECT 
  'pff-sentinel-wallet-001',
  s.citizen_device_id,
  s.id,
  CASE 
    WHEN s.plan_amount = 100 THEN 'tier1'
    WHEN s.plan_amount = 200 THEN 'tier2'
    ELSE 'tier3'
  END,
  CASE 
    WHEN s.plan_amount = 100 THEN 10
    WHEN s.plan_amount = 200 THEN 20
    ELSE 30
  END,
  s.plan_amount,
  CASE 
    WHEN s.plan_amount = 100 THEN 10
    WHEN s.plan_amount = 200 THEN 20
    ELSE 30
  END,
  'pending'
FROM subscriptions s
WHERE s.sentinel_wallet_address = 'pff-sentinel-wallet-001';

-- ============================================
-- SAMPLE VERIFICATION STATS (for Charts)
-- ============================================
INSERT INTO verification_stats (
  sentinel_wallet_address,
  date,
  total_verifications,
  successful_verifications,
  failed_verifications,
  total_earnings_usd,
  total_earnings_vida
)
SELECT 
  'pff-sentinel-wallet-001',
  CURRENT_DATE - (n || ' days')::interval,
  floor(random() * 40 + 10)::int,  -- 10-50 verifications per day
  floor(random() * 35 + 10)::int,  -- 10-45 successful
  floor(random() * 5)::int,        -- 0-5 failed
  floor(random() * 80 + 20)::numeric,  -- $20-$100 earnings per day
  floor(random() * 80 + 20)::numeric   -- 20-100 VIDA per day
FROM generate_series(0, 29) n;

-- ============================================
-- SAMPLE PAYMENT TRANSACTIONS
-- ============================================
INSERT INTO payment_transactions (
  subscription_id,
  from_address,
  to_address,
  amount_usd,
  amount_vida,
  transaction_hash,
  transaction_type,
  status,
  block_number,
  gas_used,
  confirmed_at
)
SELECT 
  s.id,
  p.wallet_address,  -- Citizen's internal wallet
  'pff-sentinel-wallet-001',  -- Sentinel's internal wallet
  s.plan_amount,
  s.plan_amount,  -- 1:1 VIDA:USD for testing
  'pff-tx-' || md5(random()::text),  -- Mock transaction hash
  'subscription',
  'confirmed',
  floor(random() * 1000000 + 5000000)::bigint,  -- Mock block number
  floor(random() * 50000 + 21000)::numeric,     -- Mock gas used
  s.last_payment_date
FROM subscriptions s
JOIN profiles p ON p.device_id = s.citizen_device_id
WHERE s.sentinel_wallet_address = 'pff-sentinel-wallet-001';

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
  'Profiles' as table_name, 
  COUNT(*)::text as count 
FROM profiles

UNION ALL

SELECT 
  'Subscriptions', 
  COUNT(*)::text 
FROM subscriptions 
WHERE sentinel_wallet_address = 'pff-sentinel-wallet-001'

UNION ALL

SELECT
  'Pending Earnings',
  COUNT(*)::text
FROM sentinel_earnings
WHERE sentinel_wallet_address = 'pff-sentinel-wallet-001'
AND status = 'pending'

UNION ALL

SELECT
  'Verification Stats',
  COUNT(*)::text
FROM verification_stats
WHERE sentinel_wallet_address = 'pff-sentinel-wallet-001'

UNION ALL

SELECT
  'Payment Transactions',
  COUNT(*)::text
FROM payment_transactions
WHERE to_address = 'pff-sentinel-wallet-001';

