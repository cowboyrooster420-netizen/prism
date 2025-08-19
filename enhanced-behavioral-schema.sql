-- Enhanced Behavioral Analysis Schema
-- Adds real data tracking and confidence scoring

-- Update existing behavioral analysis table
ALTER TABLE token_behavioral_analysis 
ADD COLUMN IF NOT EXISTS data_confidence NUMERIC(3,2) DEFAULT 0.0;

ALTER TABLE token_behavioral_analysis 
ADD COLUMN IF NOT EXISTS analysis_source TEXT DEFAULT 'mathematical_fallback';

ALTER TABLE token_behavioral_analysis 
ADD COLUMN IF NOT EXISTS real_data_percentage NUMERIC(5,2) DEFAULT 0.0;

ALTER TABLE token_behavioral_analysis 
ADD COLUMN IF NOT EXISTS helius_transactions_analyzed INTEGER DEFAULT 0;

ALTER TABLE token_behavioral_analysis 
ADD COLUMN IF NOT EXISTS analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for performance on analysis tracking
CREATE INDEX IF NOT EXISTS idx_behavioral_analysis_source 
ON token_behavioral_analysis(analysis_source);

CREATE INDEX IF NOT EXISTS idx_behavioral_confidence 
ON token_behavioral_analysis(data_confidence DESC);

CREATE INDEX IF NOT EXISTS idx_behavioral_timestamp 
ON token_behavioral_analysis(analysis_timestamp DESC);

-- Create table for real transaction tracking
CREATE TABLE IF NOT EXISTS behavioral_transaction_cache (
  id SERIAL PRIMARY KEY,
  token_address TEXT NOT NULL,
  transaction_signature TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- 'whale_buy', 'whale_sell', 'holder_new', etc.
  amount NUMERIC(20,8),
  amount_usd NUMERIC(12,2),
  source_wallet TEXT,
  destination_wallet TEXT,
  timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
  helius_processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(token_address, transaction_signature, transaction_type)
);

-- Create indexes for transaction cache
CREATE INDEX IF NOT EXISTS idx_transaction_cache_token 
ON behavioral_transaction_cache(token_address);

CREATE INDEX IF NOT EXISTS idx_transaction_cache_timestamp 
ON behavioral_transaction_cache(timestamp_utc DESC);

CREATE INDEX IF NOT EXISTS idx_transaction_cache_type 
ON behavioral_transaction_cache(transaction_type);

-- Create analysis performance tracking table
CREATE TABLE IF NOT EXISTS behavioral_analysis_performance (
  id SERIAL PRIMARY KEY,
  token_address TEXT NOT NULL,
  analysis_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  analysis_duration_ms INTEGER NOT NULL,
  analysis_source TEXT NOT NULL,
  real_data_percentage NUMERIC(5,2) NOT NULL,
  data_confidence NUMERIC(3,2) NOT NULL,
  helius_api_calls INTEGER DEFAULT 0,
  helius_transactions_found INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance tracking
CREATE INDEX IF NOT EXISTS idx_performance_token 
ON behavioral_analysis_performance(token_address);

CREATE INDEX IF NOT EXISTS idx_performance_source 
ON behavioral_analysis_performance(analysis_source);

CREATE INDEX IF NOT EXISTS idx_performance_created 
ON behavioral_analysis_performance(created_at DESC);

-- Create view for real vs mathematical analysis comparison
CREATE OR REPLACE VIEW behavioral_analysis_quality AS
SELECT 
  tba.token_address,
  tba.analysis_source,
  tba.data_confidence,
  tba.real_data_percentage,
  tba.helius_transactions_analyzed,
  tba.new_holders_24h,
  tba.whale_buys_24h,
  tba.volume_spike_ratio,
  tba.smart_money_score,
  tba.analysis_timestamp,
  bap.analysis_duration_ms,
  bap.helius_api_calls
FROM token_behavioral_analysis tba
LEFT JOIN behavioral_analysis_performance bap ON tba.token_address = bap.token_address
WHERE tba.analysis_timestamp >= NOW() - INTERVAL '7 days'
ORDER BY tba.analysis_timestamp DESC;

-- Add comments for documentation
COMMENT ON COLUMN token_behavioral_analysis.data_confidence IS 'Confidence score 0.0-1.0 based on real data quality';
COMMENT ON COLUMN token_behavioral_analysis.analysis_source IS 'Source: real_only, real_primary, hybrid, mathematical_fallback, error_fallback';
COMMENT ON COLUMN token_behavioral_analysis.real_data_percentage IS 'Percentage of metrics derived from real transaction analysis';
COMMENT ON COLUMN token_behavioral_analysis.helius_transactions_analyzed IS 'Number of actual transactions analyzed by Helius';

COMMENT ON TABLE behavioral_transaction_cache IS 'Cache of individual transactions analyzed for behavioral metrics';
COMMENT ON TABLE behavioral_analysis_performance IS 'Performance tracking for behavioral analysis system';
COMMENT ON VIEW behavioral_analysis_quality IS 'Quality metrics for behavioral analysis system performance';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON token_behavioral_analysis TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE ON behavioral_transaction_cache TO your_app_user;
-- GRANT SELECT, INSERT ON behavioral_analysis_performance TO your_app_user;
-- GRANT SELECT ON behavioral_analysis_quality TO your_app_user;

SELECT 'Enhanced behavioral analysis schema updated successfully' as status;