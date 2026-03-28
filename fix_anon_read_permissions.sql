-- Fix anon role read permissions for custom auth app
-- Since RLS is disabled on these tables, we just need to grant SELECT to anon

GRANT SELECT ON public.subjects TO anon;
GRANT SELECT ON public.courses TO anon;
GRANT SELECT ON public.course_enrollments TO anon;
GRANT SELECT ON public.modules TO anon;

-- Verify
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('subjects', 'courses', 'course_enrollments', 'modules')
  AND grantee = 'anon'
ORDER BY table_name;
