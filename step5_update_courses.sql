-- Drop the check constraint temporarily
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_enrollment_type_check;

-- Update the data
UPDATE courses 
SET enrollment_type = 'student' 
WHERE enrollment_type = 'trainee';

UPDATE courses 
SET enrollment_type = 'scholar' 
WHERE enrollment_type = 'tesda_scholar';

-- Recreate the constraint with new values
ALTER TABLE courses 
ADD CONSTRAINT courses_enrollment_type_check 
CHECK (enrollment_type IN ('admin', 'developer', 'instructor', 'scholar', 'student', 'guest'));
