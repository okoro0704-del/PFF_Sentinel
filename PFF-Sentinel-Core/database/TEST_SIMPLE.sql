-- Simple test to verify Supabase connection
-- Run this first to make sure everything works

CREATE TABLE IF NOT EXISTS test_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- If this works, you'll see success message
SELECT 'Database connection working!' as status;

