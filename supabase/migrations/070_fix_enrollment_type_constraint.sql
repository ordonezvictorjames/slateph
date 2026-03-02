-- =============================================
-- FIX ENROLLMENT TYPE CONSTRAINT
-- Update to use 'trainee' instead of 'student'
-- =============================================

-- Drop the old constraint
ALTER TABLE course_schedules 
DROP CONSTRAINT IF EXISTS course_schedules_enrollment_type_check;

-- Add new constraint with 'trainee' instead of 'student'
ALTER TABLE course_schedules 
ADD CONSTRAINT course_schedules_enrollment_type_check 
CHECK (enrollment_type IN ('trainee', 'tesda_scholar', 'both'));

-- Update any existing 'student' values to 'trainee'
UPDATE course_schedules 
SET enrollment_type = 'trainee' 
WHERE enrollment_type = 'student';

COMMENT ON COLUMN course_schedules.enrollment_type IS 'Type of enrollment: trainee, tesda_scholar, or both';
