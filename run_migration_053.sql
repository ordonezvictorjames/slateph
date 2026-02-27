-- Migration: Add section and grade columns to profiles table
-- Run this in your Supabase SQL Editor

-- Add section column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS section TEXT;

-- Add grade column (integer only)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade INTEGER;

-- Add check constraint to ensure grade is between 1 and 12
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grade_range'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT grade_range CHECK (grade IS NULL OR (grade >= 1 AND grade <= 12));
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN profiles.section IS 'Student section assignment (scientist surname)';
COMMENT ON COLUMN profiles.grade IS 'Student grade level (1-12)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name IN ('section', 'grade')
ORDER BY column_name;
