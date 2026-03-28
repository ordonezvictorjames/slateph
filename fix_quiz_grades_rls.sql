-- Fix quiz_grades RLS for custom authentication
-- This app uses custom auth (profiles table), not Supabase Auth.
-- auth.uid() returns NULL so all RLS policies block reads/writes.
-- Disable RLS and rely on app-level access control instead.

ALTER TABLE quiz_grades DISABLE ROW LEVEL SECURITY;

-- Drop the broken policies
DROP POLICY IF EXISTS "students_read_own_grades" ON quiz_grades;
DROP POLICY IF EXISTS "students_insert_own_grades" ON quiz_grades;
DROP POLICY IF EXISTS "staff_read_all_grades" ON quiz_grades;

SELECT 'quiz_grades RLS disabled - submissions should now load correctly' as status;
