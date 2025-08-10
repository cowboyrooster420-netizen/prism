-- ===============================================
-- AI-POWERED WATCHLIST SYSTEM DATABASE SETUP
-- ===============================================
-- Run this entire script in your Supabase SQL editor

-- Create watchlists table
CREATE TABLE IF NOT EXISTS watchlists (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ai', 'user', 'premium')),
    is_public BOOLEAN DEFAULT false,
    max_tokens INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create watchlist_tokens junction table
CREATE TABLE IF NOT EXISTS watchlist_tokens (
    id BIGSERIAL PRIMARY KEY,
    watchlist_id BIGINT REFERENCES watchlists(id) ON DELETE CASCADE,
    token_address VARCHAR(50) REFERENCES tokens(address) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    removed_at TIMESTAMP WITH TIME ZONE,
    ai_confidence_score NUMERIC(5, 4) DEFAULT 0, -- 0.0000 to 1.0000
    ai_reasoning TEXT,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(watchlist_id, token_address)
);

-- Create AI analysis table for tracking AI decisions
CREATE TABLE IF NOT EXISTS ai_analysis (
    id BIGSERIAL PRIMARY KEY,
    token_address VARCHAR(50) REFERENCES tokens(address) ON DELETE CASCADE,
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    bullish_score NUMERIC(5, 4) DEFAULT 0, -- 0.0000 to 1.0000
    bearish_score NUMERIC(5, 4) DEFAULT 0,
    confidence_score NUMERIC(5, 4) DEFAULT 0,
    reasoning TEXT,
    factors JSONB DEFAULT '{}', -- Store specific factors that influenced the decision
    recommendation VARCHAR(20) CHECK (recommendation IN ('add', 'remove', 'hold', 'monitor')),
    watchlist_id BIGINT REFERENCES watchlists(id) ON DELETE CASCADE
);

-- Create premium subscriptions table
CREATE TABLE IF NOT EXISTS premium_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_type VARCHAR(20) NOT NULL CHECK (subscription_type IN ('basic', 'pro', 'enterprise')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    watchlist_access BOOLEAN DEFAULT false,
    ai_insights_access BOOLEAN DEFAULT false,
    real_time_alerts BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id)
);

-- Create AI watchlist configuration table
CREATE TABLE IF NOT EXISTS ai_watchlist_config (
    id BIGSERIAL PRIMARY KEY,
    watchlist_id BIGINT REFERENCES watchlists(id) ON DELETE CASCADE,
    min_volume_24h NUMERIC(20, 2) DEFAULT 10000,
    min_market_cap NUMERIC(20, 2) DEFAULT 100000,
    min_holders INTEGER DEFAULT 100,
    min_liquidity NUMERIC(20, 2) DEFAULT 50000,
    max_tokens INTEGER DEFAULT 25,
    update_frequency_minutes INTEGER DEFAULT 30,
    bullish_threshold NUMERIC(5, 4) DEFAULT 0.7, -- Minimum confidence to add
    bearish_threshold NUMERIC(5, 4) DEFAULT 0.6, -- Confidence to remove
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_watchlist_tokens_watchlist_id ON watchlist_tokens(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_tokens_token_address ON watchlist_tokens(token_address);
CREATE INDEX IF NOT EXISTS idx_watchlist_tokens_active ON watchlist_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_analysis_token_date ON ai_analysis(token_address, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_watchlist ON ai_analysis(watchlist_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_user ON premium_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_status ON premium_subscriptions(status) WHERE status = 'active';

-- Function to update watchlist timestamps
CREATE OR REPLACE FUNCTION update_watchlist_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for watchlist updates
DROP TRIGGER IF EXISTS update_watchlist_timestamps ON watchlists;
CREATE TRIGGER update_watchlist_timestamps
    BEFORE UPDATE ON watchlists
    FOR EACH ROW
    EXECUTE FUNCTION update_watchlist_timestamps();

-- Function to get AI watchlist tokens
CREATE OR REPLACE FUNCTION get_ai_watchlist_tokens(watchlist_id_param BIGINT)
RETURNS TABLE(
    address VARCHAR(50),
    name VARCHAR(100),
    symbol VARCHAR(20),
    price NUMERIC(30, 15),
    volume_24h NUMERIC(20, 2),
    price_change_24h NUMERIC(10, 4),
    market_cap NUMERIC(20, 2),
    ai_confidence_score NUMERIC(5, 4),
    ai_reasoning TEXT,
    added_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.address,
        t.name,
        t.symbol,
        t.price,
        t.volume_24h,
        t.price_change_24h,
        t.market_cap,
        wt.ai_confidence_score,
        wt.ai_reasoning,
        wt.added_at
    FROM watchlist_tokens wt
    JOIN tokens t ON wt.token_address = t.address
    WHERE wt.watchlist_id = watchlist_id_param
        AND wt.is_active = true
        AND t.is_active = true
    ORDER BY wt.ai_confidence_score DESC, t.volume_24h DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get AI analysis history
CREATE OR REPLACE FUNCTION get_ai_analysis_history(token_address_param VARCHAR(50), days INTEGER DEFAULT 7)
RETURNS TABLE(
    analysis_date TIMESTAMP WITH TIME ZONE,
    bullish_score NUMERIC(5, 4),
    bearish_score NUMERIC(5, 4),
    confidence_score NUMERIC(5, 4),
    recommendation VARCHAR(20),
    reasoning TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aa.analysis_date,
        aa.bullish_score,
        aa.bearish_score,
        aa.confidence_score,
        aa.recommendation,
        aa.reasoning
    FROM ai_analysis aa
    WHERE aa.token_address = token_address_param
        AND aa.analysis_date >= NOW() - INTERVAL '1 day' * days
    ORDER BY aa.analysis_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_watchlist_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read access to public watchlists" ON watchlists
    FOR SELECT USING (is_public = true);

CREATE POLICY "Service role full access" ON watchlists
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Public read access to public watchlist tokens" ON watchlist_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM watchlists w 
            WHERE w.id = watchlist_tokens.watchlist_id 
            AND w.is_public = true
        )
    );

CREATE POLICY "Service role full access to watchlist tokens" ON watchlist_tokens
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to ai analysis" ON ai_analysis
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to premium subscriptions" ON premium_subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to ai config" ON ai_watchlist_config
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant permissions
GRANT ALL ON watchlists TO service_role;
GRANT ALL ON watchlist_tokens TO service_role;
GRANT ALL ON ai_analysis TO service_role;
GRANT ALL ON premium_subscriptions TO service_role;
GRANT ALL ON ai_watchlist_config TO service_role;
GRANT SELECT ON watchlists TO authenticated;
GRANT SELECT ON watchlist_tokens TO authenticated;
GRANT SELECT ON ai_analysis TO authenticated;

-- Insert default AI watchlist
INSERT INTO watchlists (name, description, type, is_public, max_tokens) 
VALUES ('Prism AI Watchlist', 'AI-curated list of promising Solana tokens', 'ai', true, 25)
ON CONFLICT DO NOTHING;

-- Insert default AI configuration
INSERT INTO ai_watchlist_config (watchlist_id, min_volume_24h, min_market_cap, min_holders, min_liquidity, max_tokens, update_frequency_minutes, bullish_threshold, bearish_threshold)
SELECT 
    w.id,
    10000,   -- min_volume_24h
    100000,  -- min_market_cap
    100,     -- min_holders
    50000,   -- min_liquidity
    25,      -- max_tokens
    30,      -- update_frequency_minutes
    0.7,     -- bullish_threshold
    0.6      -- bearish_threshold
FROM watchlists w 
WHERE w.name = 'Prism AI Watchlist'
ON CONFLICT DO NOTHING;

-- Show setup results
SELECT 'Setup completed successfully!' as status;
SELECT 'Watchlist created with ID: ' || id as result FROM watchlists WHERE name = 'Prism AI Watchlist';
