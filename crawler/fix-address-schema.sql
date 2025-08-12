-- Migration script to fix the address field issue
-- This script will update the existing database schema to use mint_address instead of address

-- First, let's check what's currently in the database
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tokens' AND column_name IN ('address', 'mint_address');

-- If address column exists, rename it to mint_address
DO $$ 
BEGIN
    -- Check if address column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tokens' AND column_name = 'address'
    ) THEN
        -- Rename address to mint_address
        ALTER TABLE tokens RENAME COLUMN address TO mint_address;
        RAISE NOTICE 'Renamed address column to mint_address';
    ELSE
        RAISE NOTICE 'address column does not exist, checking for mint_address';
    END IF;
    
    -- Check if mint_address column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tokens' AND column_name = 'mint_address'
    ) THEN
        -- Add mint_address column if it doesn't exist
        ALTER TABLE tokens ADD COLUMN mint_address VARCHAR(50);
        RAISE NOTICE 'Added mint_address column';
    END IF;
END $$;

-- Update the constraint on mint_address to match Solana address format
ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_mint_address_check;
ALTER TABLE tokens ADD CONSTRAINT tokens_mint_address_check 
    CHECK (length(mint_address) BETWEEN 32 AND 50 AND mint_address ~ '^[1-9A-HJ-NP-Za-km-z]+$');

-- Update the unique constraint
DROP INDEX IF EXISTS idx_tokens_address;
CREATE UNIQUE INDEX idx_tokens_mint_address ON tokens USING btree(mint_address);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tokens' AND column_name = 'mint_address';

-- Show sample data to verify
SELECT id, name, symbol, mint_address, length(mint_address) as addr_length
FROM tokens 
LIMIT 5;
