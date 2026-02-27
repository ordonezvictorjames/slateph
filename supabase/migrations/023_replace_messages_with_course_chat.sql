-- Migration: Replace general messages table with course-specific chat
-- This will drop the old messages table and create course_chat_messages

-- 1. Drop the old messages table and related objects
DROP TABLE IF EXISTS public.messages CASCADE;
DROP FUNCTION IF EXISTS delete_old_messages() CASCADE;
DROP FUNCTION IF EXISTS limit_total_messages() CASCADE;
DROP FUNCTION IF EXISTS get_recent_messages(TEXT, INT) CASCADE;

-- 2. Create course_chat_messages table for group chat messages
CREATE TABLE IF NOT EXISTS course_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT message_length CHECK (char_length(message) > 0 AND char_length(message) <= 2000)
);

-- 3. Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_course_chat_messages_course_id ON course_chat_messages(course_id);
CREATE INDEX IF NOT EXISTS idx_course_chat_messages_created_at ON course_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_course_chat_messages_sender_id ON course_chat_messages(sender_id);

-- 4. Enable Row Level Security
ALTER TABLE course_chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policy: Users can read messages from courses they have access to
CREATE POLICY "Users can read course chat messages" ON course_chat_messages
  FOR SELECT
  USING (
    -- Admin can see all messages
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Students can see messages from courses they're enrolled in
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = course_chat_messages.course_id
      AND course_enrollments.student_id = auth.uid()
    )
    OR
    -- Instructors can see messages from courses assigned to them
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.course_id = course_chat_messages.course_id
      AND subjects.instructor_id = auth.uid()
    )
  );

-- 6. RLS Policy: Users can insert messages to courses they have access to
CREATE POLICY "Users can send course chat messages" ON course_chat_messages
  FOR INSERT
  WITH CHECK (
    -- Admin can send to any course
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Students can send to courses they're enrolled in
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = course_chat_messages.course_id
      AND course_enrollments.student_id = auth.uid()
    )
    OR
    -- Instructors can send to courses assigned to them
    EXISTS (
      SELECT 1 FROM subjects
      WHERE subjects.course_id = course_chat_messages.course_id
      AND subjects.instructor_id = auth.uid()
    )
  );

-- 7. RLS Policy: Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON course_chat_messages
  FOR DELETE
  USING (sender_id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- 8. Function to automatically delete messages older than 7 days
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM course_chat_messages
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 9. Enable Realtime for course_chat_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE course_chat_messages;

-- 10. Add comments for documentation
COMMENT ON TABLE course_chat_messages IS 'Stores group chat messages for each course. Messages are automatically deleted after 7 days.';
COMMENT ON COLUMN course_chat_messages.course_id IS 'Reference to the course this message belongs to';
COMMENT ON COLUMN course_chat_messages.sender_id IS 'Reference to the user who sent the message';
COMMENT ON COLUMN course_chat_messages.message IS 'The message content';
COMMENT ON COLUMN course_chat_messages.created_at IS 'Timestamp when the message was created';

-- Note: To enable automatic cleanup, you need pg_cron extension:
-- SELECT cron.schedule('delete-old-chat-messages', '0 0 * * *', 'SELECT delete_old_chat_messages()');
-- Or run manually: SELECT delete_old_chat_messages();
