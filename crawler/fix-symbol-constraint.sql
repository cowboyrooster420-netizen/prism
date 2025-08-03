-- Fix symbol constraint to allow $ symbols
-- This migration updates the existing tokens table to allow $ in symbol names

-- Drop the existing constraint
ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_symbol_check;

-- Add the new constraint that allows $ symbols
ALTER TABLE tokens ADD CONSTRAINT tokens_symbol_check 
    CHECK (symbol ~ '^[A-Z0-9$]{2,20}$');

-- Verify the change
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'tokens_symbol_check'; 