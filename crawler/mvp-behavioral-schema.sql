-- MVP Behavioral Data Schema Addition
-- This script safely adds behavioral tracking columns to the existing tokens table

-- Add MVP behavioral columns to existing tokens table
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS 
    -- Behavioral Data (MVP differentiators)
    new_holders_24h INTEGER DEFAULT 0 CHECK (new_holders_24h >= 0),
    whale_buys_24h INTEGER DEFAULT 0 CHECK (whale_buys_24h >= 0),
    volume_spike_ratio NUMERIC(5,2) DEFAULT 1.0 CHECK (volume_spike_ratio >= 0),
    token_age_hours INTEGER DEFAULT 0 CHECK (token_age_hours >= 0);

-- Add behavioral data index for query performance
CREATE INDEX IF NOT EXISTS idx_tokens_behavioral 
    ON tokens(new_holders_24h DESC, whale_buys_24h DESC, volume_spike_ratio DESC);

-- Add token age index (for "new tokens" queries)
CREATE INDEX IF NOT EXISTS idx_tokens_age ON tokens(token_age_hours ASC);

-- Add composite index for common behavioral queries
CREATE INDEX IF NOT EXISTS idx_tokens_behavioral_active 
    ON tokens(is_active, new_holders_24h DESC, whale_buys_24h DESC) 
    WHERE is_active = true;

-- Update the quality_tokens view to include behavioral signals
CREATE OR REPLACE VIEW quality_tokens WITH (security_invoker=true) AS
SELECT *,
    -- Behavioral quality indicators
    CASE 
        WHEN new_holders_24h > 50 THEN 'high_holder_growth'
        WHEN new_holders_24h > 10 THEN 'moderate_holder_growth'
        ELSE 'low_holder_growth'
    END as holder_growth_signal,
    
    CASE 
        WHEN whale_buys_24h > 5 THEN 'high_whale_activity'
        WHEN whale_buys_24h > 2 THEN 'moderate_whale_activity'
        ELSE 'low_whale_activity'
    END as whale_activity_signal,
    
    CASE 
        WHEN volume_spike_ratio > 3 THEN 'high_volume_spike'
        WHEN volume_spike_ratio > 2 THEN 'moderate_volume_spike'
        ELSE 'normal_volume'
    END as volume_spike_signal

FROM tokens
WHERE is_active = true
    AND volume_24h > 1000
    AND holders > 50
    AND liquidity > 10000
ORDER BY tier ASC, volume_24h DESC;

-- Create a new view specifically for behavioral screening
CREATE OR REPLACE VIEW behavioral_tokens WITH (security_invoker=true) AS
SELECT *,
    -- Behavioral scoring
    (
        (CASE WHEN new_holders_24h > 20 THEN 30 ELSE new_holders_24h * 1.5 END) +
        (CASE WHEN whale_buys_24h > 5 THEN 40 ELSE whale_buys_24h * 8 END) +
        (CASE WHEN volume_spike_ratio > 2 THEN 30 ELSE (volume_spike_ratio - 1) * 30 END)
    ) as behavioral_score

FROM tokens
WHERE is_active = true
    AND (new_holders_24h > 0 OR whale_buys_24h > 0 OR volume_spike_ratio > 1.5)
ORDER BY behavioral_score DESC, volume_24h DESC;

-- Add comments for documentation
COMMENT ON COLUMN tokens.new_holders_24h IS 'Count of new unique token holders in the last 24 hours';
COMMENT ON COLUMN tokens.whale_buys_24h IS 'Count of buy transactions >$10k USD in the last 24 hours';
COMMENT ON COLUMN tokens.volume_spike_ratio IS 'Current 24h volume divided by 7-day average volume';
COMMENT ON COLUMN tokens.token_age_hours IS 'Hours since first recorded transaction for this token';

-- Verification queries (run these to test the schema changes)
/*
-- Test the new columns exist
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'tokens' 
    AND column_name IN ('new_holders_24h', 'whale_buys_24h', 'volume_spike_ratio', 'token_age_hours');

-- Test the new indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'tokens' 
    AND indexname LIKE '%behavioral%' OR indexname LIKE '%age%';

-- Test the updated views work
SELECT COUNT(*) FROM behavioral_tokens;
SELECT COUNT(*) FROM quality_tokens;
*/