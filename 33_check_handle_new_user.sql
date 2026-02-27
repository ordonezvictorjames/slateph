-- Check the handle_new_user trigger function
-- Date: February 27, 2026

SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_new_user';
