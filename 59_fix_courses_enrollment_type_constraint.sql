-- Fix the courses enrollment_type constraint to accept 'trainee'
-- First, check current constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'courses'::regclass AND conname LIKE '%enrollment%';

-- Drop the old constraint
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_enrollment_type_check;

-- Add new constraint with correct values
ALTER TABLE courses 
ADD CONSTRAINT courses_enrollment_type_check 
CHECK (enrollment_type IN ('trainee', 'tesda_scholar', 'both'));

-- Verify
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'courses'::regclass AND conname LIKE '%enrollment%';
