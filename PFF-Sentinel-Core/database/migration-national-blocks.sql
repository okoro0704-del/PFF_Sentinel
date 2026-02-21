-- Migration: Add national_blocks table for National Swap Bridge reserve tracking
-- Run in Supabase SQL Editor if you already have the main schema applied

CREATE TABLE IF NOT EXISTS national_blocks (
  country_code TEXT PRIMARY KEY,
  total_vida_reserved NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_national_blocks_country ON national_blocks(country_code);

-- Seed Nigeria row so we can increment
INSERT INTO national_blocks (country_code, total_vida_reserved)
VALUES ('NG', 0)
ON CONFLICT (country_code) DO NOTHING;
