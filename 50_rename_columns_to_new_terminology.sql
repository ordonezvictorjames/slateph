-- Rename columns to use new terminology
-- peer_lead_id -> instructor_id
-- participant_id -> trainee_id

-- 1. Rename peer_lead_id to instructor_id in subjects table
ALTER TABLE subjects 
RENAME COLUMN peer_lead_id TO instructor_id;

-- 2. Rename participant_id to trainee_id in course_enrollments table
ALTER TABLE course_enrollments 
RENAME COLUMN participant_id TO trainee_id;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subjects' AND column_name LIKE '%instructor%';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'course_enrollments' AND column_name LIKE '%trainee%';
