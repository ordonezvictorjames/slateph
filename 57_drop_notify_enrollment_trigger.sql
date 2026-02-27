-- Drop the specific trigger that's causing the issue
DROP TRIGGER IF EXISTS trigger_notify_course_enrollment ON course_enrollments;

-- Verify it's gone
SELECT 
    trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'course_enrollments';
