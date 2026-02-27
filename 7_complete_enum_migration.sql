-- Complete enum migration with policy handling
-- Date: February 27, 2026
-- This script: drops views, drops policies, updates enum, recreates everything

-- ============================================
-- STEP 1: DROP VIEWS THAT DEPEND ON ROLE COLUMN
-- ============================================

DROP VIEW IF EXISTS activity_logs_with_users CASCADE;

-- ============================================
-- STEP 2: DROP ALL POLICIES ON PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Developers full access" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all non-developer profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert non-developer profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update non-developer profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete non-developer profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage non-developer profiles" ON profiles;
DROP POLICY IF EXISTS "Developers can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Instructors can view trainees" ON profiles;
DROP POLICY IF EXISTS "Trainees can view other trainees" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- ============================================
-- STEP 2: UPDATE THE ENUM TYPE
-- ============================================

-- Remove the default value temporarily
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Add a temporary text column
ALTER TABLE profiles ADD COLUMN role_temp TEXT;

-- Copy the role values as text
UPDATE profiles SET role_temp = role::TEXT;

-- Drop the old role column
ALTER TABLE profiles DROP COLUMN role;

-- Rename the old enum type
ALTER TYPE user_role RENAME TO user_role_old;

-- Create the new enum type with all needed roles
CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'trainee', 'tesda_scholar', 'developer');

-- Add the role column back with the new type
ALTER TABLE profiles ADD COLUMN role user_role;

-- Migrate the data from temp column to new role column
UPDATE profiles 
SET role = CASE 
  WHEN role_temp = 'peer_lead' THEN 'instructor'::user_role
  WHEN role_temp = 'participant' THEN 'trainee'::user_role
  WHEN role_temp = 'student' THEN 'trainee'::user_role
  WHEN role_temp = 'instructor' THEN 'instructor'::user_role
  WHEN role_temp = 'teacher' THEN 'instructor'::user_role
  WHEN role_temp = 'tesda_scholar' THEN 'tesda_scholar'::user_role
  WHEN role_temp = 'admin' THEN 'admin'::user_role
  WHEN role_temp = 'developer' THEN 'developer'::user_role
  ELSE 'trainee'::user_role
END;

-- Drop the temporary column
ALTER TABLE profiles DROP COLUMN role_temp;

-- Set the new default value
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'trainee'::user_role;

-- Make role NOT NULL
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;

-- Drop the old enum type
DROP TYPE user_role_old;

-- Update the constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- ============================================
-- STEP 3: RECREATE POLICIES
-- ============================================

-- Developers can do everything
CREATE POLICY "Developers full access"
  ON profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'developer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'developer'
    )
  );

-- Admins can view all non-developer profiles
CREATE POLICY "Admins can view all non-developer profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
    AND role != 'developer'
  );

-- Admins can manage non-developer profiles
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
    AND role != 'developer'
  );

CREATE POLICY "Admins can update non-developer profiles"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
    AND role != 'developer'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
    AND role != 'developer'
  );

CREATE POLICY "Admins can delete non-developer profiles"
  ON profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
    AND role != 'developer'
  );

-- Instructors can view trainees
CREATE POLICY "Instructors can view trainees"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'instructor'
    )
    AND role IN ('trainee', 'tesda_scholar')
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- STEP 4: RECREATE VIEW
-- ============================================

CREATE OR REPLACE VIEW activity_logs_with_users AS
SELECT 
  al.*,
  p.first_name,
  p.last_name,
  p.email,
  p.role
FROM activity_logs al
LEFT JOIN profiles p ON al.user_id = p.id;

-- ============================================
-- STEP 5: VERIFY
-- ============================================

-- Check roles
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role 
ORDER BY role;

-- Check policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
