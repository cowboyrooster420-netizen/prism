-- ===============================================
-- OHLCV DATA COLLECTION SCHEMA FOR SUPABASE
-- ===============================================
-- Execute this script in your Supabase SQL Editor

-- Create the main OHLCV history table
CREATE TABLE IF NOT EXISTS token_ohlcv_history (
    id BIGSERIAL PRIMARY KEY,
    
    -- Token reference
    token_address VARCHAR(50) NOT NULL,
    
    -- Time data
    timestamp_unix BIGINT NOT NULL,
    timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Timeframe (1h, 4h, 1d, etc.)
    timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('1m', '5m', '15m', '1h', '4h', '1d', '1w')),
    
    -- OHLCV data
    open_price NUMERIC(30, 15) NOT NULL CHECK (open_price >= 0),
    high_price NUMERIC(30, 15) NOT NULL CHECK (high_price >= 0),
    low_price NUMERIC(30, 15) NOT NULL CHECK (low_price >= 0),
    close_price NUMERIC(30, 15) NOT NULL CHECK (close_price >= 0),
    volume NUMERIC(20, 2) DEFAULT 0 CHECK (volume >= 0),
    
    -- Additional useful data
    volume_usd NUMERIC(20, 2) DEFAULT 0 CHECK (volume_usd >= 0),
    
    -- Data quality and source tracking
    data_source VARCHAR(20) NOT NULL DEFAULT 'birdeye',
    confidence_score NUMERIC(3, 2) DEFAULT 1.0 CHECK (confidence_score BETWEEN 0 AND 1),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent duplicates
    UNIQUE(token_address, timeframe, timestamp_unix)
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_ohlcv_token_timeframe ON token_ohlcv_history(token_address, timeframe);
CREATE INDEX IF NOT EXISTS idx_ohlcv_token_time ON token_ohlcv_history(token_address, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_timestamp ON token_ohlcv_history(timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_ohlcv_timeframe ON token_ohlcv_history(timeframe);
CREATE INDEX IF NOT EXISTS idx_ohlcv_source ON token_ohlcv_history(data_source);
CREATE INDEX IF NOT EXISTS idx_ohlcv_token_timeframe_time ON token_ohlcv_history(token_address, timeframe, timestamp_utc DESC);

-- Create collection status tracking table
CREATE TABLE IF NOT EXISTS ohlcv_collection_status (
    id BIGSERIAL PRIMARY KEY,
    token_address VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    last_collection_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_successful_timestamp TIMESTAMP WITH TIME ZONE,
    collection_errors INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(token_address, timeframe)
);

-- Simple indexes for collection status (no partial indexes)
CREATE INDEX IF NOT EXISTS idx_collection_status_token ON ohlcv_collection_status(token_address, timeframe);
CREATE INDEX IF NOT EXISTS idx_collection_status_active ON ohlcv_collection_status(is_active);

-- Function to get the latest timestamp for a token/timeframe (for incremental updates)
CREATE OR REPLACE FUNCTION get_latest_ohlcv_timestamp(
    token_addr VARCHAR(50),
    timeframe_param VARCHAR(10) DEFAULT '1h'
)
RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    latest_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT MAX(timestamp_utc) INTO latest_timestamp
    FROM token_ohlcv_history
    WHERE token_address = token_addr
        AND timeframe = timeframe_param;
    
    RETURN latest_timestamp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get historical OHLCV data for TA analysis
CREATE OR REPLACE FUNCTION get_token_ohlcv_history(
    token_addr VARCHAR(50),
    timeframe_param VARCHAR(10) DEFAULT '1h',
    days_back INTEGER DEFAULT 30,
    limit_rows INTEGER DEFAULT 1000
)
RETURNS TABLE(
    timestamp_unix BIGINT,
    timestamp_utc TIMESTAMP WITH TIME ZONE,
    open_price NUMERIC(30, 15),
    high_price NUMERIC(30, 15),
    low_price NUMERIC(30, 15),
    close_price NUMERIC(30, 15),
    volume NUMERIC(20, 2),
    volume_usd NUMERIC(20, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.timestamp_unix,
        h.timestamp_utc,
        h.open_price,
        h.high_price,
        h.low_price,
        h.close_price,
        h.volume,
        h.volume_usd
    FROM token_ohlcv_history h
    WHERE h.token_address = token_addr
        AND h.timeframe = timeframe_param
        AND h.timestamp_utc >= NOW() - INTERVAL '1 day' * days_back
    ORDER BY h.timestamp_utc DESC
    LIMIT limit_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get data availability summary
CREATE OR REPLACE FUNCTION get_ohlcv_data_summary()
RETURNS TABLE(
    token_address VARCHAR(50),
    timeframes TEXT[],
    earliest_data TIMESTAMP WITH TIME ZONE,
    latest_data TIMESTAMP WITH TIME ZONE,
    total_candles BIGINT,
    days_of_data INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.token_address,
        ARRAY_AGG(DISTINCT h.timeframe ORDER BY h.timeframe) as timeframes,
        MIN(h.timestamp_utc) as earliest_data,
        MAX(h.timestamp_utc) as latest_data,
        COUNT(*) as total_candles,
        EXTRACT(days FROM (MAX(h.timestamp_utc) - MIN(h.timestamp_utc)))::INTEGER as days_of_data
    FROM token_ohlcv_history h
    GROUP BY h.token_address
    ORDER BY total_candles DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security
ALTER TABLE token_ohlcv_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ohlcv_collection_status ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access to OHLCV data
CREATE POLICY "Allow public read access to ohlcv" ON token_ohlcv_history
    FOR SELECT
    USING (true);

-- RLS Policy: Allow service role full access (for data collection)
CREATE POLICY "Allow service role full access to ohlcv" ON token_ohlcv_history
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR auth.jwt() ->> 'iss' = 'supabase'
    );

-- RLS Policy for collection status
CREATE POLICY "Allow service role full access to status" ON ohlcv_collection_status
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR auth.jwt() ->> 'iss' = 'supabase'
    );

-- Grant permissions
GRANT SELECT ON token_ohlcv_history TO authenticated;
GRANT ALL ON token_ohlcv_history TO service_role;
GRANT ALL ON ohlcv_collection_status TO service_role;

-- Show completion message
SELECT 'OHLCV schema created successfully!' as status,
       'Tables: token_ohlcv_history, ohlcv_collection_status' as tables_created,
       'Functions: get_latest_ohlcv_timestamp, get_token_ohlcv_history, get_ohlcv_data_summary' as functions_created;