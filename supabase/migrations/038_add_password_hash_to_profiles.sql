-- =============================================
-- ADD PASSWORD HASH COLUMN TO PROFILES TABLE
-- Adds password_hash column for storing hashed passwords
-- =============================================

-- Add password_hash column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE profiles ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- Add index for faster password lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
