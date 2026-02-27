-- Step 3: Recreate RLS policies based on user flow
-- Run this AFTER the enum migration

-- USER FLOW:
-- Admin: Can add, edit, delete, view courses, subjects, modules, schedule. Can manage all user types except developer.
-- Instructor: Can view trainees at My Students, access assigned courses at My Courses, view courses table.
-- Trainee: Can access enrolled courses at My Courses, view courses table.
-- Developer: Can access ALL FUNCTIONS.

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Admins can manage all profiles except developers
CREATE POLICY "Admins can manage non-developer profiles"
  ON profiles
  FOR ALL
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

-- Instructors can view trainees (for My Students page)
CREATE POLICY "Instructors can view trainees"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'instructor'
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
-- COURSES TABLE POLICIES
-- ============================================

-- Admins can manage all courses
CREATE POLICY "Admins can manage courses"
  ON courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Developers can manage all courses
CREATE POLICY "Developers can manage courses"
  ON courses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'developer'
    )
  );

-- Everyone can view courses (for Courses page)
CREATE POLICY "Everyone can view courses"
  ON courses
  FOR SELECT
  USING (true);

-- ============================================
-- SUBJECTS TABLE POLICIES
-- ============================================

-- Admins can manage subjects
CREATE POLICY "Admins can manage subjects"
  ON subjects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Developers can manage subjects
CREATE POLICY "Developers can manage subjects"
  ON subjects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'developer'
    )
  );

-- Everyone can view subjects
CREATE POLICY "Everyone can view subjects"
  ON subjects
  FOR SELECT
  USING (true);

-- ============================================
-- MODULES TABLE POLICIES
-- ============================================

-- Admins can manage modules
CREATE POLICY "Admins can manage modules"
  ON modules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Developers can manage modules
CREATE POLICY "Developers can manage modules"
  ON modules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'developer'
    )
  );

-- Everyone can view modules
CREATE POLICY "Everyone can view modules"
  ON modules
  FOR SELECT
  USING (true);

-- ============================================
-- SUBJECT_ENROLLMENTS TABLE POLICIES
-- ============================================

-- Admins can manage enrollments
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

-- Developers can manage enrollments
CREATE POLICY "Developers can manage enrollments"
  ON subject_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'developer'
    )
  );

-- Instructors can view enrollments for their assigned subjects
CREATE POLICY "Instructors can view their subject enrollments"
  ON subject_enrollments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.id = subject_enrollments.subject_id
      AND subjects.instructor_id = auth.uid()
    )
  );

-- Trainees can view their own enrollments
CREATE POLICY "Trainees can view their enrollments"
  ON subject_enrollments
  FOR SELECT
  USING (student_id = auth.uid());

-- ============================================
-- COURSE_ENROLLMENTS TABLE POLICIES (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_enrollments') THEN
    -- Admins can manage course enrollments
    EXECUTE 'CREATE POLICY "Admins can manage course enrollments" ON course_enrollments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin''))';
    
    -- Developers can manage course enrollments
    EXECUTE 'CREATE POLICY "Developers can manage course enrollments" ON course_enrollments FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''developer''))';
    
    -- Instructors can view enrollments for their courses
    EXECUTE 'CREATE POLICY "Instructors can view their course enrollments" ON course_enrollments FOR SELECT USING (EXISTS (SELECT 1 FROM courses WHERE courses.id = course_enrollments.course_id AND courses.instructor_id = auth.uid()))';
    
    -- Trainees can view their own course enrollments
    EXECUTE 'CREATE POLICY "Trainees can view their course enrollments" ON course_enrollments FOR SELECT USING (student_id = auth.uid())';
  END IF;
END $$;

-- ============================================
-- ACTIVITY_LOGS TABLE POLICIES
-- ============================================

-- Admins and developers can view activity logs
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

-- ============================================
-- SCHEDULE/CLASS_SCHEDULES TABLE POLICIES (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'class_schedules') THEN
    -- Admins can manage schedules
    EXECUTE 'CREATE POLICY "Admins can manage schedules" ON class_schedules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''admin''))';
    
    -- Developers can manage schedules
    EXECUTE 'CREATE POLICY "Developers can manage schedules" ON class_schedules FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = ''developer''))';
    
    -- Everyone can view schedules
    EXECUTE 'CREATE POLICY "Everyone can view schedules" ON class_schedules FOR SELECT USING (true)';
  END IF;
END $$;

-- Verify policies were created
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
