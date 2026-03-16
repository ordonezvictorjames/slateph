-- ============================================================
-- COMPLETE SCRIPT: Drop everything dependent, swap enum, recreate all
-- Run as ONE block in Supabase SQL Editor
-- ============================================================

-- 1. Drop functions that depend on user_role
DROP FUNCTION IF EXISTS public.test_profile_insert(text, text, text, user_role);
DROP FUNCTION IF EXISTS public.get_expiring_accounts(integer);

-- 2. Drop the backup table that depends on user_role
DROP TABLE IF EXISTS profiles_backup_20260308;

-- 3. Drop the view that depends on role
DROP VIEW IF EXISTS activity_logs_with_users;

-- 4. Drop all RLS policies that reference the role column
DROP POLICY IF EXISTS "Enrolled users can view course chat messages" ON course_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own course chat messages" ON course_chat_messages;
DROP POLICY IF EXISTS "Enrolled users can send course chat messages" ON course_chat_messages;
DROP POLICY IF EXISTS "Temporary full access for developers" ON course_enrollments;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins and instructors can manage enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can delete their own lounge chat messages" ON lounge_chat_messages;
DROP POLICY IF EXISTS "Admins can update non-developer profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete non-developer profiles" ON profiles;
DROP POLICY IF EXISTS "Instructors can view trainees" ON profiles;
DROP POLICY IF EXISTS "Developers full access" ON profiles;
DROP POLICY IF EXISTS "Admins can view all non-developer profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow admins and developers to delete resources" ON subject_resources;
DROP POLICY IF EXISTS "Allow admins and developers to update resources" ON subject_resources;
DROP POLICY IF EXISTS "Allow admins and developers to insert resources" ON subject_resources;

-- 5. Drop column default, swap enum, restore default
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM (
  'admin', 'developer', 'instructor',
  'shs_student', 'jhs_student', 'college_student',
  'scholar', 'guest'
);

ALTER TABLE profiles
  ALTER COLUMN role TYPE user_role
  USING role::text::user_role;

ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'guest'::user_role;

DROP TYPE user_role_old CASCADE;

-- 6. Recreate the view
CREATE VIEW activity_logs_with_users AS
  SELECT
    al.id, al.user_id, al.activity_type, al.description,
    al.metadata, al.created_at,
    p.first_name, p.last_name, p.email, p.role
  FROM activity_logs al
  LEFT JOIN profiles p ON al.user_id = p.id;

-- 7. Recreate functions with new enum
CREATE OR REPLACE FUNCTION public.get_expiring_accounts(days_threshold integer DEFAULT 7)
RETURNS TABLE(id uuid, email text, first_name text, last_name text, role user_role, account_expires_at timestamp with time zone, days_until_expiration integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.email, p.first_name, p.last_name, p.role, p.account_expires_at,
    EXTRACT(DAY FROM (p.account_expires_at - NOW()))::INTEGER as days_until_expiration
  FROM profiles p
  WHERE p.account_expires_at IS NOT NULL
    AND p.account_expires_at > NOW()
    AND p.account_expires_at < NOW() + (days_threshold || ' days')::INTERVAL
    AND p.status = 'active'
  ORDER BY p.account_expires_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.test_profile_insert(p_first_name text, p_last_name text, p_email text, p_role user_role)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email, role, status, created_at, updated_at)
  VALUES (v_user_id, p_first_name, p_last_name, p_email, p_role, 'active', NOW(), NOW());
  RETURN json_build_object('success', true, 'message', 'Profile created successfully', 'user_id', v_user_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$function$;

-- 8. Recreate all RLS policies
CREATE POLICY "Enrolled users can view course chat messages" ON course_chat_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = course_chat_messages.course_id AND enrollments.user_id = auth.uid() AND enrollments.status = 'active')
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::user_role, 'developer'::user_role, 'instructor'::user_role]))
  );

CREATE POLICY "Users can delete their own course chat messages" ON course_chat_messages
  FOR DELETE USING (
    sender_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::user_role, 'developer'::user_role]))
  );

CREATE POLICY "Enrolled users can send course chat messages" ON course_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM enrollments WHERE enrollments.course_id = course_chat_messages.course_id AND enrollments.user_id = auth.uid() AND enrollments.status = 'active')
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::user_role, 'developer'::user_role, 'instructor'::user_role]))
  );

CREATE POLICY "Temporary full access for developers" ON course_enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'developer'::user_role)
  );

CREATE POLICY "Users can view their own enrollments" ON enrollments
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::user_role, 'developer'::user_role, 'instructor'::user_role]))
  );

CREATE POLICY "Admins and instructors can manage enrollments" ON enrollments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::user_role, 'developer'::user_role, 'instructor'::user_role]))
  );

CREATE POLICY "Users can delete their own lounge chat messages" ON lounge_chat_messages
  FOR DELETE USING (
    sender_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::user_role, 'developer'::user_role]))
  );

CREATE POLICY "Admins can update non-developer profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'::user_role)
    AND role <> 'developer'::user_role
  );

CREATE POLICY "Admins can delete non-developer profiles" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'::user_role)
    AND role <> 'developer'::user_role
  );

CREATE POLICY "Instructors can view trainees" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'instructor'::user_role)
    AND role = ANY (ARRAY['shs_student'::user_role, 'jhs_student'::user_role, 'college_student'::user_role, 'scholar'::user_role])
  );

CREATE POLICY "Developers full access" ON profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'developer'::user_role)
  );

CREATE POLICY "Admins can view all non-developer profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'::user_role)
    AND role <> 'developer'::user_role
  );

CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = ANY (ARRAY['admin'::user_role, 'developer'::user_role]))
  );

CREATE POLICY "Allow admins and developers to delete resources" ON subject_resources
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::user_role, 'developer'::user_role]))
  );

CREATE POLICY "Allow admins and developers to update resources" ON subject_resources
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::user_role, 'developer'::user_role]))
  );

CREATE POLICY "Allow admins and developers to insert resources" ON subject_resources
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ANY (ARRAY['admin'::user_role, 'developer'::user_role]))
  );

-- 9. Verify
SELECT role, COUNT(*) FROM profiles GROUP BY role ORDER BY role;
