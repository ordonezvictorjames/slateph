-- =============================================
-- ADD SPOTIFY URL TO PROFILES
-- Adds spotify_url column for Spotify embed links
-- =============================================

-- Add spotify_url column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS spotify_url TEXT;

-- Add comment to column
COMMENT ON COLUMN profiles.spotify_url IS 'Spotify track/playlist/album URL for profile music player';
