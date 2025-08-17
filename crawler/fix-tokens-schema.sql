-- Fix tokens table schema by adding missing updated_at column
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to have the current timestamp
UPDATE tokens SET updated_at = NOW() WHERE updated_at IS NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tokens' 
AND column_name = 'updated_at';