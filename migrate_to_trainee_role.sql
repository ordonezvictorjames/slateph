-- Migration: Update user roles to use 'trainee' instead of peer_lead, participant, student, instructor, teacher
-- Date: February 27, 2026

-- IMPORTANT: This script will drop ALL RLS policies and recreate them
-- Make sure to backup your database before running this migration

-- Step 1: Drop ALL RLS policies on tables that use the role column
-- We need to drop all policies, not just specific ones

-- Drop all policies on subject_enrollments
DROP POLICY IF EXISTS "Admins and instructors can manage enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Students can view own enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Trainees can view their enrollments" ON subject_enrollments;
DROP POLICY IF EXISTS "Instructors can view enrollments" ON subject_enrollments;

-- Drop all policies on profiles
DROP POLICY IF EXISTS "Admins and developers can manage" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all" ON profiles;
DROP POLICY IF EXISTS "Instructors can view their students" ON profiles;
DROP POLICY IF EXISTS "Students can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins and developers can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Drop all policies on subjects
DROP POLICY IF EXISTS "Admins and instructors can manage subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
DROP POLICY IF EXISTS "Everyone can view subjects" ON subjects;

-- Drop all policies on modules
DROP POLICY IF EXISTS "Admins and instructors can manage modules" ON modules;
DROP POLICY IF EXISTS "Admins can manage modules" ON modules;
DROP POLICY IF EXISTS "Everyone can view modules" ON modules;

-- Drop all policies on courses
DROP POLICY IF EXISTS "Admins and instructors can manage courses" ON courses;
DROP POLICY IF EXISTS "Instructors can manage their courses" ON courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
DROP POLICY IF EXISTS "Everyone can view active courses" ON courses;

-- Drop all policies on activity_logs
DROP POLICY IF EXISTS "Admins and developers can insert" ON activity_logs;
DROP POLICY IF EXISTS "Admins and developers can view all" ON activity_logs;
DROP POLICY IF EXISTS "Admins and developers can view activity logs" ON activity_logs;

-- Drop all policies on course_enrollments
DROP POLICY IF EXISTS "Admins can manage enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Students can view their enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Trainees can view their enrollments" ON course_enrollments;

-- Drop all policies on assignments
DROP POLICY IF EXISTS "Instructors can manage assignments" ON assignments;
DROP POLICY IF EXISTS "Students can view assignments" ON assignments;

-- Drop all policies on course_chat
DROP POLICY IF EXISTS "Users can view messages in their courses" ON course_chat;
DROP POLICY IF EXISTS "Users can send messages in their courses" ON course_chat;

-- Step 2: Remove the default value temporarily
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Step 3: Rename the old enum type
ALTER TYPE user_role RENAME TO user_role_old;

-- Step 4: Create the new enum type with only admin, trainee, and developer
CREATE TYPE user_role AS ENUM ('admin', 'trainee', 'developer');

-- Step 5: Update the column to use the new type and migrate existing data
ALTER TABLE profiles 
  ALTER COLUMN role TYPE user_role 
  USING 
    CASE 
      WHEN role::text = 'peer_lead' THEN 'trainee'::user_role
      WHEN role::text = 'participant' THEN 'trainee'::user_role
      WHEN role::text = 'student' THEN 'trainee'::user_role
      WHEN role::text = 'instructor' THEN 'trainee'::user_role
      WHEN role::text = 'teacher' THEN 'trainee'::user_role
      WHEN role::text = 'tesda_scholar' THEN 'trainee'::user_role
      WHEN role::text = 'admin' THEN 'admin'::user_role
      WHEN role::text = 'developer' THEN 'developer'::user_role
      ELSE 'trainee'::user_role
    END;

-- Step 6: Set the new default value
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'trainee'::user_role;

-- Step 7: Drop the old enum type
DROP TYPE user_role_old;

-- Step 8: Update the constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['admin'::user_role, 'trainee'::user_role, 'developer'::user_role]));

-- Step 9: Recreate essential RLS policies with updated role references

-- Profiles table policies
CREATE POLICY "Admins and developers can manage profiles"
  ON profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Subject enrollments policies
CREATE POLICY "Admins can manage enrollments"
  ON subject_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Trainees can view their enrollments"
  ON subject_enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- Course enrollments policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_enrollments') THEN
    EXECUTE 'CREATE POLICY "Admins can manage course enrollments" ON course_enrollments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin''))';
    EXECUTE 'CREATE POLICY "Trainees can view their course enrollments" ON course_enrollments FOR SELECT USING (student_id = auth.uid())';
  END IF;
END $$;

-- Courses policies
CREATE POLICY "Admins can manage courses"
  ON courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

CREATE POLICY "Everyone can view active courses"
  ON courses
  FOR SELECT
  USING (is_active = true);

-- Subjects policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subjects') THEN
    EXECUTE 'CREATE POLICY "Admins can manage subjects" ON subjects FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN (''admin'', ''developer'')))';
    EXECUTE 'CREATE POLICY "Everyone can view subjects" ON subjects FOR SELECT USING (true)';
  END IF;
END $$;

-- Modules policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'modules') THEN
    EXECUTE 'CREATE POLICY "Admins can manage modules" ON modules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN (''admin'', ''developer'')))';
    EXECUTE 'CREATE POLICY "Everyone can view modules" ON modules FOR SELECT USING (true)';
  END IF;
END $$;

-- Activity logs policies
CREATE POLICY "Admins and developers can view activity logs"
  ON activity_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Verify the migration
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role 
ORDER BY role;
