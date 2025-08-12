-- Comprehensive Token Tracking Schema
-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "http" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA extensions;

-- Clean up existing objects (CAREFUL: This will delete all existing data!)
DROP TABLE IF EXISTS tokens CASCADE;
DROP MATERIALIZED VIEW IF EXISTS trending_tokens CASCADE;
DROP VIEW IF EXISTS quality_tokens CASCADE;
DROP FUNCTION IF EXISTS update_last_updated_column() CASCADE;
DROP FUNCTION IF EXISTS refresh_trending_tokens() CASCADE;
DROP FUNCTION IF EXISTS search_tokens() CASCADE;
DROP FUNCTION IF EXISTS get_token_stats() CASCADE;

-- Create a custom URL validation function that handles various URL formats
CREATE OR REPLACE FUNCTION extensions.validate_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Allow NULL/empty URLs
    IF url IS NULL OR url = '' THEN
        RETURN TRUE;
    END IF;
    
    -- Allow various URL formats including IPFS, Arweave, CDN, and standard URLs
    RETURN url ~ '^https?://[a-zA-Z0-9.-]+(\.[a-zA-Z]{2,})*(:[0-9]+)?(/[a-zA-Z0-9._~:/?#[\]@!$&''()*+,;=%\-]*)*$' OR
           url ~ '^ipfs://[a-zA-Z0-9]+(/[a-zA-Z0-9._~:/?#[\]@!$&''()*+,;=%\-]*)*$' OR
           url ~ '^ar://[a-zA-Z0-9]+(/[a-zA-Z0-9._~:/?#[\]@!$&''()*+,;=%\-]*)*$' OR
           url ~ '^data:image/[a-zA-Z]+;base64,[a-zA-Z0-9+/=]*$';
END;
$$ LANGUAGE plpgsql;

-- Create the main tokens table with robust validation
CREATE TABLE tokens (
    id BIGSERIAL PRIMARY KEY,

    -- Core token identification
    mint_address VARCHAR(50) UNIQUE NOT NULL 
        CHECK (length(mint_address) BETWEEN 32 AND 50 AND mint_address ~ '^[1-9A-HJ-NP-Za-km-z]+$'),
    name VARCHAR(100) NOT NULL 
        CHECK (length(name) BETWEEN 2 AND 100),
    symbol VARCHAR(20) NOT NULL 
        CHECK (symbol ~ '^[A-Za-z0-9$]{2,20}$'),

    -- Price and market data
    price NUMERIC(30, 15) DEFAULT 0 
        CHECK (price >= 0 AND price < 1000000000),
    market_cap NUMERIC(20, 2) DEFAULT 0 
        CHECK (market_cap >= 0),

    -- Volume metrics
    volume_24h NUMERIC(20, 2) DEFAULT 0 
        CHECK (volume_24h >= 0),
    volume_7d NUMERIC(20, 2) DEFAULT 0 
        CHECK (volume_7d >= 0),

    -- Price change metrics (allowing for extreme crypto volatility)
    price_change_24h NUMERIC(10, 4) DEFAULT 0 
        CHECK (price_change_24h BETWEEN -9999 AND 9999),
    price_change_7d NUMERIC(10, 4) DEFAULT 0 
        CHECK (price_change_7d BETWEEN -9999 AND 9999),

    -- Liquidity and holder data
    liquidity NUMERIC(20, 2) DEFAULT 0 
        CHECK (liquidity >= 0),
    holders INTEGER DEFAULT 0 
        CHECK (holders >= 0),
    holder_change_24h INTEGER DEFAULT 0,

    -- All-time metrics
    all_time_high NUMERIC(30, 15) DEFAULT 0 
        CHECK (all_time_high >= 0),
    all_time_low NUMERIC(30, 15) DEFAULT 0 
        CHECK (all_time_low >= 0),

    -- Classification and quality
    tier INTEGER DEFAULT 3 
        CHECK (tier IN (1, 2, 3)),
    source VARCHAR(20) NOT NULL 
        CHECK (length(source) BETWEEN 2 AND 20),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,

    -- Smart wallet tracking
    smart_wallet_activity JSONB DEFAULT '{}',

    -- URL fields with validation
    logo_url TEXT 
        CHECK (logo_url IS NULL OR extensions.validate_url(logo_url)),
    website_url TEXT 
        CHECK (website_url IS NULL OR extensions.validate_url(website_url)),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comprehensive indexes for optimal query performance
CREATE INDEX idx_tokens_mint_address ON tokens USING btree(mint_address);
CREATE INDEX idx_tokens_tier ON tokens USING btree(tier);
CREATE INDEX idx_tokens_volume_24h ON tokens USING btree(volume_24h DESC);
CREATE INDEX idx_tokens_market_cap ON tokens USING btree(market_cap DESC);
CREATE INDEX idx_tokens_price_change_24h ON tokens USING btree(price_change_24h DESC);
CREATE INDEX idx_tokens_last_updated ON tokens USING btree(last_updated DESC);
CREATE INDEX idx_tokens_is_active ON tokens USING btree(is_active);
CREATE INDEX idx_tokens_source ON tokens USING btree(source);
CREATE INDEX idx_tokens_created_at ON tokens USING btree(created_at DESC);
CREATE INDEX idx_tokens_holders ON tokens USING btree(holders DESC);

-- Composite and partial indexes for advanced query patterns
CREATE INDEX idx_tokens_active_tier_volume ON tokens(is_active, tier, volume_24h DESC) 
    WHERE is_active = true;
CREATE INDEX idx_tokens_active_volume ON tokens(is_active, volume_24h DESC) 
    WHERE is_active = true;
CREATE INDEX idx_tokens_tier_volume ON tokens(tier, volume_24h DESC);
CREATE INDEX idx_tokens_active_price_change ON tokens(is_active, price_change_24h DESC) 
    WHERE is_active = true;

-- GIN index for smart_wallet_activity JSONB queries and full-text search
CREATE INDEX idx_tokens_smart_wallet_activity ON tokens USING GIN (smart_wallet_activity);
CREATE INDEX idx_tokens_name_search ON tokens USING GIN (to_tsvector('english', name));
CREATE INDEX idx_tokens_symbol_search ON tokens USING GIN (to_tsvector('english', symbol));

-- Function to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update timestamp on any row change
CREATE TRIGGER update_tokens_last_updated
BEFORE UPDATE ON tokens
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_column();

-- View for quality tokens (frequently used query)
CREATE OR REPLACE VIEW quality_tokens WITH (security_invoker=true) AS
SELECT *
FROM tokens
WHERE is_active = true
    AND volume_24h > 1000
    AND holders > 50
    AND liquidity > 10000
ORDER BY tier ASC, volume_24h DESC;

-- Materialized view for trending tokens (better performance)
CREATE MATERIALIZED VIEW trending_tokens AS
SELECT
    mint_address,
    name,
    symbol,
    price,
    volume_24h,
    price_change_24h,
    market_cap,
    holders,
    tier,
    last_updated
FROM tokens
WHERE is_active = true
    AND volume_24h > 5000
    AND price_change_24h > 5
ORDER BY volume_24h DESC
LIMIT 100;

-- Indexes on materialized view
CREATE INDEX idx_trending_tokens_volume ON trending_tokens(volume_24h DESC);
CREATE INDEX idx_trending_tokens_price_change ON trending_tokens(price_change_24h DESC);

-- Function to refresh trending tokens materialized view
CREATE OR REPLACE FUNCTION refresh_trending_tokens()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comprehensive token statistics function
CREATE OR REPLACE FUNCTION get_token_stats()
RETURNS TABLE(
    total_tokens BIGINT,
    active_tokens BIGINT,
    tier_1_count BIGINT,
    tier_2_count BIGINT,
    tier_3_count BIGINT,
    avg_volume_24h NUMERIC,
    total_volume_24h NUMERIC,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) AS total_tokens,
        COUNT(*) FILTER (WHERE is_active = true) AS active_tokens,
        COUNT(*) FILTER (WHERE tier = 1 AND is_active = true) AS tier_1_count,
        COUNT(*) FILTER (WHERE tier = 2 AND is_active = true) AS tier_2_count,
        COUNT(*) FILTER (WHERE tier = 3 AND is_active = true) AS tier_3_count,
        AVG(volume_24h) FILTER (WHERE is_active = true) AS avg_volume_24h,
        SUM(volume_24h) FILTER (WHERE is_active = true) AS total_volume_24h,
        MAX(tokens.last_updated) AS last_updated
    FROM tokens;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Advanced full-text search function for tokens
CREATE OR REPLACE FUNCTION search_tokens(search_query TEXT)
RETURNS TABLE(
    mint_address VARCHAR(50),
    name VARCHAR(100),
    symbol VARCHAR(20),
    price NUMERIC(30, 15),
    volume_24h NUMERIC(20, 2),
    market_cap NUMERIC(20, 2),
    tier INTEGER,
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.mint_address,
        t.name,
        t.symbol,
        t.price,
        t.volume_24h,
        t.market_cap,
        t.tier,
        ROW_NUMBER() OVER (ORDER BY t.volume_24h DESC)::INTEGER AS rank
    FROM tokens t
    WHERE t.is_active = true
    AND (
        t.name ILIKE '%' || search_query || '%'
        OR t.symbol ILIKE '%' || search_query || '%'
        OR to_tsvector('english', t.name) @@ plainto_tsquery('english', search_query)
        OR to_tsvector('english', t.symbol) @@ plainto_tsquery('english', search_query)
    )
    ORDER BY t.volume_24h DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access to all tokens
CREATE POLICY "Allow public read access" ON tokens
    FOR SELECT
    USING (true);

-- RLS Policy: Allow service role full access (for your crawler)
CREATE POLICY "Allow service role full access" ON tokens
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR auth.jwt() ->> 'iss' = 'supabase'
    );

-- Insert some initial verified tokens (optional)
INSERT INTO tokens (
    mint_address,
    name,
    symbol,
    tier,
    is_verified,
    source
) VALUES
    ('So11111111111111111111111111111111111111112', 'Wrapped SOL', 'SOL', 1, true, 'manual'),
    ('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'USD Coin', 'USDC', 1, true, 'manual'),
    ('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 'Tether USD', 'USDT', 1, true, 'manual')
ON CONFLICT (mint_address) DO NOTHING;

-- Grant necessary permissions
GRANT ALL ON tokens TO authenticated;
GRANT ALL ON tokens TO service_role;
GRANT SELECT ON quality_tokens TO authenticated;
GRANT SELECT ON trending_tokens TO authenticated;

-- Optional: Schedule refresh of trending tokens (requires pg_cron extension)
-- Uncomment and adjust as needed
-- SELECT cron.schedule('refresh-trending-tokens', '*/15 * * * *', 'SELECT refresh_trending_tokens();'); 