-- Complete Behavioral Analysis Schema
-- Creates the behavioral analysis system with real data tracking

-- Create the main behavioral analysis table
CREATE TABLE IF NOT EXISTS token_behavioral_analysis (
  id SERIAL PRIMARY KEY,
  token_address TEXT NOT NULL UNIQUE,
  
  -- Core behavioral metrics
  new_holders_24h INTEGER DEFAULT 0 CHECK (new_holders_24h >= 0),
  whale_buys_24h INTEGER DEFAULT 0 CHECK (whale_buys_24h >= 0),
  volume_spike_ratio NUMERIC(5,2) DEFAULT 1.0 CHECK (volume_spike_ratio >= 0),
  token_age_hours INTEGER DEFAULT 0 CHECK (token_age_hours >= 0),
  transaction_pattern_score NUMERIC(5,2) DEFAULT 0 CHECK (transaction_pattern_score >= 0),
  smart_money_score NUMERIC(5,2) DEFAULT 0 CHECK (smart_money_score >= 0),
  
  -- Enhanced real data tracking columns
  data_confidence NUMERIC(3,2) DEFAULT 0.0 CHECK (data_confidence >= 0 AND data_confidence <= 1),
  analysis_source TEXT DEFAULT 'mathematical_fallback' CHECK (analysis_source IN (
    'real_only', 'real_primary', 'hybrid', 'mathematical_fallback', 'error_fallback'
  )),
  real_data_percentage NUMERIC(5,2) DEFAULT 0.0 CHECK (real_data_percentage >= 0 AND real_data_percentage <= 100),
  helius_transactions_analyzed INTEGER DEFAULT 0 CHECK (helius_transactions_analyzed >= 0),
  
  -- Timestamps
  analysis_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance on main table
CREATE INDEX IF NOT EXISTS idx_behavioral_token_address 
ON token_behavioral_analysis(token_address);

CREATE INDEX IF NOT EXISTS idx_behavioral_analysis_source 
ON token_behavioral_analysis(analysis_source);

CREATE INDEX IF NOT EXISTS idx_behavioral_confidence 
ON token_behavioral_analysis(data_confidence DESC);

CREATE INDEX IF NOT EXISTS idx_behavioral_timestamp 
ON token_behavioral_analysis(analysis_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_behavioral_metrics 
ON token_behavioral_analysis(new_holders_24h DESC, whale_buys_24h DESC, volume_spike_ratio DESC);

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

-- Create view for high-quality behavioral signals
CREATE OR REPLACE VIEW high_quality_behavioral_signals AS
SELECT 
  tba.*,
  CASE 
    WHEN tba.data_confidence >= 0.7 THEN 'high_confidence'
    WHEN tba.data_confidence >= 0.4 THEN 'medium_confidence'
    ELSE 'low_confidence'
  END as confidence_level,
  
  CASE 
    WHEN tba.real_data_percentage >= 70 THEN 'real_primary'
    WHEN tba.real_data_percentage >= 30 THEN 'hybrid'
    ELSE 'mathematical_estimate'
  END as data_quality,
  
  -- Behavioral scoring
  (
    (CASE WHEN tba.new_holders_24h > 20 THEN 30 ELSE tba.new_holders_24h * 1.5 END) +
    (CASE WHEN tba.whale_buys_24h > 5 THEN 40 ELSE tba.whale_buys_24h * 8 END) +
    (CASE WHEN tba.volume_spike_ratio > 2 THEN 30 ELSE (tba.volume_spike_ratio - 1) * 30 END) +
    (tba.smart_money_score)
  ) * tba.data_confidence as weighted_behavioral_score

FROM token_behavioral_analysis tba
WHERE tba.analysis_timestamp >= NOW() - INTERVAL '24 hours'
  AND (tba.new_holders_24h > 0 OR tba.whale_buys_24h > 0 OR tba.volume_spike_ratio > 1.5)
ORDER BY weighted_behavioral_score DESC, tba.data_confidence DESC;

-- Add comments for documentation
COMMENT ON TABLE token_behavioral_analysis IS 'Main table for storing behavioral analysis results with confidence tracking';
COMMENT ON COLUMN token_behavioral_analysis.data_confidence IS 'Confidence score 0.0-1.0 based on real data quality';
COMMENT ON COLUMN token_behavioral_analysis.analysis_source IS 'Source: real_only, real_primary, hybrid, mathematical_fallback, error_fallback';
COMMENT ON COLUMN token_behavioral_analysis.real_data_percentage IS 'Percentage of metrics derived from real transaction analysis';
COMMENT ON COLUMN token_behavioral_analysis.helius_transactions_analyzed IS 'Number of actual transactions analyzed by Helius';

COMMENT ON TABLE behavioral_transaction_cache IS 'Cache of individual transactions analyzed for behavioral metrics';
COMMENT ON TABLE behavioral_analysis_performance IS 'Performance tracking for behavioral analysis system';
COMMENT ON VIEW behavioral_analysis_quality IS 'Quality metrics for behavioral analysis system performance';
COMMENT ON VIEW high_quality_behavioral_signals IS 'Filtered view of high-confidence behavioral signals for frontend consumption';

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_behavioral_analysis_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamps
DROP TRIGGER IF EXISTS trigger_update_behavioral_analysis_timestamp ON token_behavioral_analysis;
CREATE TRIGGER trigger_update_behavioral_analysis_timestamp
  BEFORE UPDATE ON token_behavioral_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_behavioral_analysis_timestamp();

SELECT 'Complete behavioral analysis schema created successfully' as status;