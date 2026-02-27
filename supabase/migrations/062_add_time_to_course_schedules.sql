-- =============================================
-- ADD TIME SUPPORT TO COURSE SCHEDULES
-- Change DATE fields to TIMESTAMP to support time
-- =============================================

-- Drop the view first
DROP VIEW IF EXISTS course_schedules_with_details;

-- Alter the columns to use TIMESTAMP instead of DATE
ALTER TABLE course_schedules 
  ALTER COLUMN start_date TYPE TIMESTAMP WITH TIME ZONE USING start_date::TIMESTAMP WITH TIME ZONE,
  ALTER COLUMN end_date TYPE TIMESTAMP WITH TIME ZONE USING end_date::TIMESTAMP WITH TIME ZONE;

-- Recreate the view with course details
CREATE OR REPLACE VIEW course_schedules_with_details AS
SELECT 
  cs.*,
  c.title as course_title,
  c.course_group,
  c.course_type,
  p.first_name as creator_first_name,
  p.last_name as creator_last_name
FROM course_schedules cs
LEFT JOIN courses c ON cs.course_id = c.id
LEFT JOIN profiles p ON cs.created_by = p.id;

-- Add comments
COMMENT ON COLUMN course_schedules.start_date IS 'Start date and time of the course schedule';
COMMENT ON COLUMN course_schedules.end_date IS 'End date and time of the course schedule';
