-- =============================================
-- REMOVE BATCH FIELDS FROM PROFILES TABLE
-- Remove batch_number and batch_year columns
-- =============================================

-- Drop the batch_number column if it exists
ALTER TABLE profiles 
DROP COLUMN IF EXISTS batch_number;

-- Drop the batch_year column if it exists
ALTER TABLE profiles 
DROP COLUMN IF EXISTS batch_year;

-- Verify the columns are removed
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('batch_number', 'batch_year');

-- Should return no rows if successfully removed
