-- =============================================
-- ADD BANNER IMAGE TO PROFILES
-- Adds banner_url column for profile banner images
-- =============================================

-- Add banner_url column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Add comment to column
COMMENT ON COLUMN profiles.banner_url IS 'URL or base64 data for user profile banner image';
