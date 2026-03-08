-- DEBUG CHAT ACCESS ISSUES

-- 1. Check if you're logged in
SELECT 
    'Current User ID' as check_type,
    auth.uid() as result;

-- 2. Check your role
SELECT 
    'Your Role' as check_type,
    role as result
FROM profiles
WHERE id = auth.uid();

-- 3. Check your enrollments
SELECT 
    'Your Enrollments' as check_type,
    c.title as course_title,
    e.status as enrollment_status
FROM enrollments e
JOIN courses c ON c.id = e.course_id
WHERE e.user_id = auth.uid();

-- 4. Check if course_chat_messages table exists
SELECT 
    'Table Exists' as check_type,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'course_chat_messages'
    ) THEN 'YES' ELSE 'NO' END as result;

-- 5. Check RLS policies on course_chat_messages
SELECT 
    'RLS Policies' as check_type,
    policyname as policy_name,
    cmd as command
FROM pg_policies
WHERE tablename = 'course_chat_messages';

-- 6. Test if you can insert (replace with real course_id)
-- Uncomment and replace 'your-course-id-here' with actual course ID
/*
INSERT INTO course_chat_messages (course_id, sender_id, message)
VALUES ('your-course-id-here', auth.uid(), 'Test message');
*/
