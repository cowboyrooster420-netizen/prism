-- Elite TA Features Migration
-- Run this in Supabase Dashboard > SQL Editor

-- Add VWAP Features
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_distance DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_upper_band DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_lower_band DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_band_position DOUBLE PRECISION;

-- Add Support/Resistance Features
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS support_level DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS resistance_level DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS support_distance DOUBLE PRECISION;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS resistance_distance DOUBLE PRECISION;

-- Add Smart Money Flow Features
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS smart_money_index DOUBLE PRECISION;

-- Add Multi-timeframe Analysis
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS trend_alignment_score DOUBLE PRECISION;

-- Add Volume Profile
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS volume_profile_score DOUBLE PRECISION;

-- Add Boolean Signals
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_breakout_bullish BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS vwap_breakout_bearish BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS near_support BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS near_resistance BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS smart_money_bullish BOOLEAN DEFAULT FALSE;
ALTER TABLE ta_features ADD COLUMN IF NOT EXISTS trend_alignment_strong BOOLEAN DEFAULT FALSE;

-- Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ta_features_vwap ON ta_features(vwap);
CREATE INDEX IF NOT EXISTS idx_ta_features_smart_money ON ta_features(smart_money_index);
CREATE INDEX IF NOT EXISTS idx_ta_features_trend_alignment ON ta_features(trend_alignment_score);
CREATE INDEX IF NOT EXISTS idx_ta_features_vwap_breakout_bullish ON ta_features(vwap_breakout_bullish);
CREATE INDEX IF NOT EXISTS idx_ta_features_near_support ON ta_features(near_support);
CREATE INDEX IF NOT EXISTS idx_ta_features_near_resistance ON ta_features(near_resistance);

-- Update the ta_latest view
DROP VIEW IF EXISTS ta_latest;
CREATE VIEW ta_latest AS
SELECT DISTINCT ON (token_id, timeframe) *
FROM ta_features
ORDER BY token_id, timeframe, ts DESC;

-- Verify the migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ta_features' 
AND column_name IN ('vwap', 'smart_money_index', 'trend_alignment_score')
ORDER BY column_name;