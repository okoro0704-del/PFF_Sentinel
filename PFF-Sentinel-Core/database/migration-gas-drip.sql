-- Migration: Add gas_drip_history table for Automated Gas Drip
-- Prevents double-sending POL to the same address in the same month

CREATE TABLE IF NOT EXISTS gas_drip_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  drip_month TEXT NOT NULL,
  amount_pol NUMERIC NOT NULL DEFAULT 0.001,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gas_drip_month ON gas_drip_history(drip_month);
CREATE INDEX IF NOT EXISTS idx_gas_drip_wallet_month ON gas_drip_history(wallet_address, drip_month);
