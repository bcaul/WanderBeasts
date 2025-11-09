-- Update CP level constraint to allow 1-3000 instead of 1-100
-- This migration updates the check constraint on the catches table

-- Drop the existing constraint
ALTER TABLE catches DROP CONSTRAINT IF EXISTS catches_cp_level_check;

-- Add the new constraint allowing CP levels from 1 to 3000
ALTER TABLE catches ADD CONSTRAINT catches_cp_level_check CHECK (cp_level >= 1 AND cp_level <= 3000);

-- Update the default value comment/documentation (optional)
COMMENT ON COLUMN catches.cp_level IS 'Combat Power level, range: 1-3000';

