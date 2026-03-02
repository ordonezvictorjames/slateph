-- =============================================
-- FIX SCHEDULE TIMEZONE HANDLING
-- Change start_date and end_date to TIMESTAMP (without timezone)
-- so they store local time as-is
-- =============================================

-- Drop the view that depends on these columns
DROP VIEW IF EXISTS course_schedules_with_details;

-- Change columns to TIMESTAMP (without timezone)
ALTER TABLE course_schedules 
ALTER COLUMN start_date TYPE TIMESTAMP USING start_date::TIMESTAMP;

ALTER TABLE course_schedules 
ALTER COLUMN end_date TYPE TIMESTAMP USING end_date::TIMESTAMP;

-- Recreate the view
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

COMMENT ON COLUMN course_schedules.start_date IS 'Schedule start date and time in local timezone';
COMMENT ON COLUMN course_schedules.end_date IS 'Schedule end date and time in local timezone';
