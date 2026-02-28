-- List ALL triggers on the subjects table
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'subjects'::regclass
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Show the actual function code for each trigger
SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_code
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'subjects'::regclass
  AND NOT t.tgisinternal;
