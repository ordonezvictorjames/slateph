-- Check current constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'courses'::regclass 
  AND conname = 'courses_enrollment_type_check';

-- Drop the old constraint
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_enrollment_type_check;

-- Add new constraint with 'trainee' instead of 'participant' or 'student'
ALTER TABLE courses 
ADD CONSTRAINT courses_enrollment_type_check 
CHECK (enrollment_type::text = ANY (ARRAY['trainee'::text, 'tesda_scholar'::text, 'both'::text]));

-- Verify the new constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'courses'::regclass 
  AND conname = 'courses_enrollment_type_check';
