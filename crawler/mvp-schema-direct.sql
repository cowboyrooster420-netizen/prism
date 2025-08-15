-- MVP Behavioral Schema Changes
-- Run this directly in your Supabase SQL Editor

-- Step 1: Add behavioral columns to existing tokens table
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS new_holders_24h INTEGER DEFAULT 0 CHECK (new_holders_24h >= 0);

ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS whale_buys_24h INTEGER DEFAULT 0 CHECK (whale_buys_24h >= 0);

ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS volume_spike_ratio NUMERIC(5,2) DEFAULT 1.0 CHECK (volume_spike_ratio >= 0);

ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS token_age_hours INTEGER DEFAULT 0 CHECK (token_age_hours >= 0);

-- Step 2: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_tokens_behavioral 
    ON tokens(new_holders_24h DESC, whale_buys_24h DESC, volume_spike_ratio DESC);

CREATE INDEX IF NOT EXISTS idx_tokens_age 
    ON tokens(token_age_hours ASC);

CREATE INDEX IF NOT EXISTS idx_tokens_behavioral_active 
    ON tokens(is_active, new_holders_24h DESC, whale_buys_24h DESC) 
    WHERE is_active = true;

-- Step 3: Verify columns were added
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'tokens' 
  AND column_name IN ('new_holders_24h', 'whale_buys_24h', 'volume_spike_ratio', 'token_age_hours')
ORDER BY column_name;