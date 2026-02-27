-- Query to list all RLS policies in your database
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
ORDER BY tablename, policyname;
