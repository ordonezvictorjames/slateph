-- Simple RLS fix for developer access
-- This allows developers to access all profiles
-- Date: February 27, 2026

-- ============================================
-- DROP OLD POLICIES ON PROFILES TABLE
-- ============================================

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
-- CREATE SIMPLE POLICIES
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
-- VERIFY POLICIES
-- ============================================

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
