-- Check all trigger functions on profiles table
-- Date: February 27, 2026

-- Get all trigger function definitions
SELECT 
    t.trigger_name,
    pg_get_functiondef(p.oid) as function_definition
FROM information_schema.triggers t
JOIN pg_proc p ON p.proname = substring(t.action_statement from 'EXECUTE FUNCTION (.+)\(\)' for '#')
WHERE t.event_object_table = 'profiles';

-- Also check each one individually
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'log_user_creation';
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'log_user_deletion';
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'log_user_update';
SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'update_updated_at_column';
