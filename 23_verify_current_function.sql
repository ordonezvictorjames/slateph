-- Verify what version of create_user_account is actually running
-- Date: February 27, 2026

-- Get the current function definition
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'create_user_account'
LIMIT 1;
