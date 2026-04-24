-- =============================================
-- ADD GENDER TO PROFILES
-- =============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));

COMMENT ON COLUMN profiles.gender IS 'User gender: male, female, or prefer_not_to_say';
