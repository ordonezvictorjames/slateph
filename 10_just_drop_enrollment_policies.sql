-- Just drop the old policies to stop the 400 errors
-- We'll recreate them once we know the correct column names

DROP POLICY IF EXISTS "Admins can manage course enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Developers can manage course enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Instructors can view their course enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Trainees can view their course enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Users can view their own enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Trainees can view their enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "TESDA Scholars can view their enrollments" ON course_enrollments;

-- Temporarily allow all access for developers to fix the issue
CREATE POLICY "Temporary full access for developers"
  ON course_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'developer'
    )
  );

-- Show remaining policies
SELECT policyname FROM pg_policies 
WHERE tablename = 'course_enrollments';
