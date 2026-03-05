-- Fix course_chat_messages RLS policies to use trainee_id instead of student_id
-- This migration updates the policies to match the renamed column in course_enrollments

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read course chat messages" ON course_chat_messages;
DROP POLICY IF EXISTS "Users can send course chat messages" ON course_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON course_chat_messages;

-- RLS Policy: Users can read messages from courses they have access to
CREATE POLICY "Users can read course chat messages" ON course_chat_messages
  FOR SELECT
  USING (
    -- Admins and developers can read all messages
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
    OR
    -- Trainees can read messages from courses they're enrolled in
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = course_chat_messages.course_id
      AND course_enrollments.trainee_id = auth.uid()
    )
    OR
    -- Instructors can read messages from courses they teach
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.course_id = course_chat_messages.course_id
      AND subjects.instructor_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert messages to courses they have access to
CREATE POLICY "Users can send course chat messages" ON course_chat_messages
  FOR INSERT
  WITH CHECK (
    -- Admins and developers can send messages to any course
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
    OR
    -- Trainees can send messages to courses they're enrolled in
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = course_chat_messages.course_id
      AND course_enrollments.trainee_id = auth.uid()
    )
    OR
    -- Instructors can send messages to courses they teach
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.course_id = course_chat_messages.course_id
      AND subjects.instructor_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON course_chat_messages
  FOR DELETE
  USING (sender_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'developer')
  ));
