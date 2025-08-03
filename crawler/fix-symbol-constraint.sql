-- Fix symbol constraint to allow lowercase letters and $ symbols
-- This addresses the database constraint violations we were seeing

-- Drop the existing constraint
ALTER TABLE tokens DROP CONSTRAINT IF EXISTS tokens_symbol_check;

-- Add the new constraint that allows lowercase letters and $ symbols
ALTER TABLE tokens ADD CONSTRAINT tokens_symbol_check
CHECK (symbol ~ '^[A-Za-z0-9$]{2,20}$');

-- Verify the constraint was applied correctly
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'tokens_symbol_check'; 