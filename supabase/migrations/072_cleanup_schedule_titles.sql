-- =============================================
-- CLEANUP SCHEDULE TITLES
-- Update old grade-based titles to use batch numbers per course
-- =============================================

-- First, recalculate batch numbers per course based on creation order
WITH numbered_schedules AS (
  SELECT 
    id,
    course_id,
    ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY created_at, id) as new_batch_number
  FROM course_schedules
)
UPDATE course_schedules cs
SET 
  batch_number = ns.new_batch_number,
  title = 'Batch ' || ns.new_batch_number
FROM numbered_schedules ns
WHERE cs.id = ns.id;

COMMENT ON COLUMN course_schedules.title IS 'Schedule title, typically "Batch X" where X is the batch number per course';
