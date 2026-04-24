-- =============================================
-- ENABLE REALTIME FOR ALL WEBSOCKET CHANNELS
-- Required for postgres_changes subscriptions to work
-- =============================================

-- Chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE lounge_chat_messages;

-- Dashboard realtime
ALTER PUBLICATION supabase_realtime ADD TABLE courses;
ALTER PUBLICATION supabase_realtime ADD TABLE subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE course_schedules;

-- Quiz grades realtime (for staff view live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_grades;

-- User presence realtime
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;

-- Ensure replica identity is set for all realtime tables
-- (required for UPDATE/DELETE events to include old row data)
ALTER TABLE lounge_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE course_chat_messages REPLICA IDENTITY FULL;
ALTER TABLE user_presence REPLICA IDENTITY FULL;
ALTER TABLE quiz_grades REPLICA IDENTITY FULL;
ALTER TABLE courses REPLICA IDENTITY FULL;
ALTER TABLE subjects REPLICA IDENTITY FULL;
ALTER TABLE course_schedules REPLICA IDENTITY FULL;
