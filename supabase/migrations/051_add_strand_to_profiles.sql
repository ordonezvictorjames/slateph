-- =============================================
-- ADD STRAND COLUMN TO PROFILES
-- For SHS (Senior High School) strand tracking
-- =============================================

-- Add strand column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS strand VARCHAR(50);

-- Add comment to explain the column
COMMENT ON COLUMN profiles.strand IS 'SHS strand for students (STEM, ABM, HUMSS, GAS, TVL, etc.)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_strand ON profiles(strand);
