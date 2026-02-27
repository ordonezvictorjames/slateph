-- Check for triggers on course_enrollments table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'course_enrollments';

-- Check trigger functions that might reference participant_id
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname LIKE '%enrollment%' OR proname LIKE '%participant%';
