-- STEP 1B: Create indexes for profiles table
-- Run this after STEP 1

CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles(is_fully_verified);
CREATE INDEX IF NOT EXISTS idx_profiles_vida_minted ON profiles(vida_minted);
CREATE INDEX IF NOT EXISTS idx_profiles_vitalization_id ON profiles(vitalization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_vault_frozen ON profiles(vault_frozen);

SELECT 'Indexes created successfully!' as status;

