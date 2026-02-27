-- Check the log_user_creation trigger function
-- Date: February 27, 2026

-- Get the function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'log_user_creation';
