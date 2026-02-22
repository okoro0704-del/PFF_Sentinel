-- Verify STEP 1 completed successfully
-- Run this to check if profiles table exists

-- Check if profiles table exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles'
    ) 
    THEN 'YES - profiles table exists'
    ELSE 'NO - profiles table does NOT exist'
  END as table_exists;

-- Check columns in profiles table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

