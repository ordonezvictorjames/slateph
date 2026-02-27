-- Temporarily disable RLS on all tables to stop 400 errors
-- This is for debugging only - we'll re-enable with proper policies later

-- Disable RLS on course_enrollments
ALTER TABLE course_enrollments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on subjects
ALTER TABLE subjects DISABLE ROW LEVEL SECURITY;

-- Disable RLS on modules
ALTER TABLE modules DISABLE ROW LEVEL SECURITY;

-- Disable RLS on courses
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;

-- Verify RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('course_enrollments', 'subjects', 'modules', 'courses', 'profiles')
ORDER BY tablename;
