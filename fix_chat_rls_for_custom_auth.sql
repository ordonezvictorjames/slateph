-- FIX CHAT RLS FOR CUSTOM AUTHENTICATION
-- Since you're using custom auth (profiles table) instead of Supabase Auth,
-- auth.uid() returns NULL. We need to disable RLS or use a different approach.

-- Option 1: Disable RLS temporarily (NOT RECOMMENDED for production)
ALTER TABLE course_chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE lounge_chat_messages DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled - chat should work now' as status;
SELECT 'WARNING: This removes all access control!' as warning;
SELECT 'You should implement proper authentication or use service role key' as recommendation;
