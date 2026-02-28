-- Check all triggers and functions that still reference peer_lead_id

-- 1. Check all function definitions for peer_lead_id
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE pg_get_functiondef(oid) LIKE '%peer_lead_id%'
ORDER BY proname;

-- 2. Check all triggers on the subjects table
SELECT 
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'subjects'::regclass
ORDER BY t.tgname;

-- 3. Check the actual columns in subjects table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subjects' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
