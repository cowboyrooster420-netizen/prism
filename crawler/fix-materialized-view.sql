-- Fix the materialized view update for Elite TA Features
-- Drop the materialized view and recreate it with new columns
DROP MATERIALIZED VIEW IF EXISTS ta_latest;
CREATE MATERIALIZED VIEW ta_latest AS
SELECT DISTINCT ON (token_id, timeframe) *
FROM ta_features
ORDER BY token_id, timeframe, ts DESC;

-- Create index on materialized view for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_ta_latest_unique ON ta_latest (token_id, timeframe);