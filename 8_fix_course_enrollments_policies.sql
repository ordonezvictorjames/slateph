-- Fix RLS policies for course_enrollments table after enum migration
-- Date: February 27, 2026

-- ============================================
-- DROP OLD POLICIES ON COURSE_ENROLLMENTS
-- ============================================

DROP POLICY IF EXISTS "Admins can manage course enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Developers can manage course enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Instructors can view their course enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Trainees can view their course enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON course_enrollments;

-- ============================================
-- CREATE NEW POLICIES FOR COURSE_ENROLLMENTS
-- ============================================

-- Developers can manage all enrollments
CREATE POLICY "Developers can manage course enrollments"
  ON course_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'developer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'developer'
    )
  );

-- Admins can manage all enrollments
CREATE POLICY "Admins can manage course enrollments"
  ON course_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Instructors can view enrollments for courses they teach
CREATE POLICY "Instructors can view course enrollments"
  ON course_enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'instructor'
    )
  );

-- Trainees can view their own enrollments
CREATE POLICY "Trainees can view their enrollments"
  ON course_enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- TESDA Scholars can view their own enrollments
CREATE POLICY "TESDA Scholars can view their enrollments"
  ON course_enrollments
  FOR SELECT
  USING (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'tesda_scholar'
    )
  );

-- ============================================
-- VERIFY POLICIES
-- ============================================

SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'course_enrollments'
ORDER BY policyname;
