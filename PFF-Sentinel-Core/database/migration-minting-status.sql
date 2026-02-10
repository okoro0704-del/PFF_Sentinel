-- Run this on existing Master Supabase if profiles already exists without minting_status
-- Adds minting_status for Status Bridge (minting_status = 'COMPLETED' → Vault Secured)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS minting_status TEXT DEFAULT 'PENDING';

-- Optional: add check constraint (skip if you need to allow other values)
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_minting_status_check;
-- ALTER TABLE profiles ADD CONSTRAINT profiles_minting_status_check
--   CHECK (minting_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'));

CREATE INDEX IF NOT EXISTS idx_profiles_minting_status ON profiles(minting_status);
