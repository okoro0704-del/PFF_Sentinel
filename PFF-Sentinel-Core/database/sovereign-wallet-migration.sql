-- ============================================
-- PFF Sentinel — Sovereign Multi-Wallet Architecture
-- Database Migration: Add wallet and role columns
-- ============================================

-- Add wallet columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS wallet_encrypted_key TEXT,
ADD COLUMN IF NOT EXISTS wallet_type TEXT DEFAULT 'EMBEDDED_SMART_WALLET',
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'CITIZEN' CHECK (role IN ('CITIZEN', 'SENTINEL', 'ARCHITECT'));

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Update existing profiles to have CITIZEN role by default
UPDATE profiles 
SET role = 'CITIZEN' 
WHERE role IS NULL;

-- Create a function to check if user is Sentinel
CREATE OR REPLACE FUNCTION is_sentinel(user_device_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM profiles WHERE device_id = user_device_id;
  RETURN user_role IN ('SENTINEL', 'ARCHITECT');
END;
$$ LANGUAGE plpgsql;

-- Create a function to get wallet address by device_id
CREATE OR REPLACE FUNCTION get_wallet_address(user_device_id TEXT)
RETURNS TEXT AS $$
DECLARE
  wallet_addr TEXT;
BEGIN
  SELECT wallet_address INTO wallet_addr FROM profiles WHERE device_id = user_device_id;
  RETURN wallet_addr;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the Sovereign Triad
COMMENT ON COLUMN profiles.wallet_address IS 'Citizen Wallet address (Embedded/Smart Wallet via Account Abstraction)';
COMMENT ON COLUMN profiles.wallet_encrypted_key IS 'Encrypted private key (encrypted with device_id)';
COMMENT ON COLUMN profiles.wallet_type IS 'Wallet type: EMBEDDED_SMART_WALLET';
COMMENT ON COLUMN profiles.role IS 'User role: CITIZEN, SENTINEL, or ARCHITECT';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Sovereign Multi-Wallet Architecture migration completed successfully';
END $$;

