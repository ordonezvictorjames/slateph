-- Find all triggers on course_enrollments table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'course_enrollments';

-- Disable ALL triggers on course_enrollments
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'course_enrollments'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON course_enrollments', r.trigger_name);
    END LOOP;
END $$;

-- Verify all triggers are gone
SELECT 
    trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'course_enrollments';
