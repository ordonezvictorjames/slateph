-- =============================================
-- ADD BATCH_NUMBER COLUMN TO PROFILES
-- For TESDA Scholar users
-- =============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS batch_number INTEGER;

COMMENT ON COLUMN profiles.batch_number IS 'Batch number for TESDA Scholar users';
