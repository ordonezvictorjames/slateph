-- Fix subjects enrollment_type constraint
-- The constraint is likely checking for old values that don't match current data

-- First, check what the current constraint allows
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'subjects_enrollment_type_check';

-- Drop the old constraint
ALTER TABLE subjects 
DROP CONSTRAINT IF EXISTS subjects_enrollment_type_check;

-- Recreate the constraint with correct values
-- Assuming enrollment_type should allow: 'student', 'scholar', 'both'
ALTER TABLE subjects
ADD CONSTRAINT subjects_enrollment_type_check 
CHECK (enrollment_type IN ('student', 'scholar', 'both'));

-- If you still use 'trainee' and 'tesda_scholar', use this instead:
-- ALTER TABLE subjects
-- ADD CONSTRAINT subjects_enrollment_type_check 
-- CHECK (enrollment_type IN ('trainee', 'tesda_scholar', 'both', 'student', 'scholar'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'subjects_enrollment_type_check';
