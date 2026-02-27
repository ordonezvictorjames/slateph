-- Fix RLS policies for trainee role
-- This updates policies to work with the new role structure: admin, trainee, developer
-- Date: February 27, 2026

-- ============================================
-- DROP OLD POLICIES ON PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can manage non-developer profiles" ON profiles;
DROP POLICY IF EXISTS "Developers can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Instructors can view trainees" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- ============================================
-- RECREATE PROFILES TABLE POLICIES
-- ============================================

-- Admins can view and manage all profiles except developers
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

CREATE POLICY "Admins can insert non-developer profiles"
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

-- Developers can manage all profiles
CREATE POLICY "Developers can manage all profiles"
  ON profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'developer'
    )
  );

-- Trainees can view other trainees (for social features)
CREATE POLICY "Trainees can view other trainees"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'trainee'
    )
    AND role = 'trainee'
  );

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- ============================================
-- VERIFY POLICIES
-- ============================================

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
