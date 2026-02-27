-- Drop all existing policies for lounge_chat_messages
DROP POLICY IF EXISTS "All users can read lounge messages" ON lounge_chat_messages;
DROP POLICY IF EXISTS "All users can send lounge messages" ON lounge_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own lounge messages" ON lounge_chat_messages;

-- Recreate all policies with correct permissions

-- RLS Policy: All authenticated users can read lounge messages
CREATE POLICY "All users can read lounge messages" ON lounge_chat_messages
  FOR SELECT
  USING (true);

-- RLS Policy: All authenticated users can send lounge messages
-- Simplified policy that allows any authenticated user to insert
CREATE POLICY "All users can send lounge messages" ON lounge_chat_messages
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can delete their own messages or admins can delete any
CREATE POLICY "Users can delete their own lounge messages" ON lounge_chat_messages
  FOR DELETE
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );
