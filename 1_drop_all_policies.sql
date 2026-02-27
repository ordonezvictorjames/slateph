-- Step 1: Find and drop ALL RLS policies
-- Run this first to see all your policies

-- List all policies in your database
SELECT 
  schemaname,
  tablename,
  policyname,
  'DROP POLICY IF EXISTS "' || policyname || '" ON ' || schemaname || '.' || tablename || ';' as drop_statement
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- After reviewing the output above, run these DROP statements:
-- Copy all the drop_statement results and run them

-- Or run this to drop ALL policies at once (use with caution):
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Dropped policy: % on %.%', r.policyname, r.schemaname, r.tablename;
  END LOOP;
END $$;
