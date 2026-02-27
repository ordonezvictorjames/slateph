-- Check current constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'subjects'::regclass AND conname LIKE '%enrollment%';

-- Drop the old constraint
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_enrollment_type_check;

-- Add new constraint with 'trainee' instead of 'participant'
ALTER TABLE subjects 
ADD CONSTRAINT subjects_enrollment_type_check 
CHECK (enrollment_type IN ('trainee', 'tesda_scholar', 'both'));
