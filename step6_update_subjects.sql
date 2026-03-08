-- Drop the check constraint temporarily
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_enrollment_type_check;

-- Update the data
UPDATE subjects 
SET enrollment_type = 'student' 
WHERE enrollment_type = 'trainee';

UPDATE subjects 
SET enrollment_type = 'scholar' 
WHERE enrollment_type = 'tesda_scholar';

-- Recreate the constraint with new values
ALTER TABLE subjects 
ADD CONSTRAINT subjects_enrollment_type_check 
CHECK (enrollment_type IN ('admin', 'developer', 'instructor', 'scholar', 'student', 'guest'));
