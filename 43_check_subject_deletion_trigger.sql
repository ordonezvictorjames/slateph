-- Check the log_subject_deletion trigger function
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'log_subject_deletion';
