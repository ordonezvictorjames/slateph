-- Fix subjects enrollment_type constraint
-- enrollment_type is for courses/subjects, NOT user roles
-- It should allow: 'trainee', 'tesda_scholar', 'both'

-- Drop the old constraint
ALTER TABLE subjects 
DROP CONSTRAINT IF EXISTS subjects_enrollment_type_check;

-- Recreate the constraint with correct enrollment type values
ALTER TABLE subjects
ADD CONSTRAINT subjects_enrollment_type_check 
CHECK (enrollment_type IN ('trainee', 'tesda_scholar', 'both'));

-- Also fix courses table if it has the same issue
ALTER TABLE courses 
DROP CONSTRAINT IF EXISTS courses_enrollment_type_check;

ALTER TABLE courses
ADD CONSTRAINT courses_enrollment_type_check 
CHECK (enrollment_type IN ('trainee', 'tesda_scholar', 'both'));

-- Verify the constraints
SELECT 
    'subjects' as table_name,
    conname as constraint_name, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'subjects_enrollment_type_check'
UNION ALL
SELECT 
    'courses' as table_name,
    conname as constraint_name, 
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'courses_enrollment_type_check';
