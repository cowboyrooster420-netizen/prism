-- Add enrichment columns to tokens table
-- Run this script in your Supabase SQL editor

-- Add last_enriched timestamp column
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS last_enriched TIMESTAMP;

-- Add holder_count column (separate from existing holders column)
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS holder_count INTEGER;

-- Add enrichment_data JSONB column for storing additional enrichment data
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS enrichment_data JSONB;

-- Add index on last_enriched for efficient querying
CREATE INDEX IF NOT EXISTS idx_tokens_last_enriched ON tokens(last_enriched);

-- Add index on holder_count for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tokens_holder_count ON tokens(holder_count);

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'tokens' 
  AND column_name IN ('last_enriched', 'holder_count', 'enrichment_data')
ORDER BY column_name; 