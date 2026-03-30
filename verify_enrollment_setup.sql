-- Run this in Supabase SQL editor to verify everything is set up correctly

-- 1. Check how many users exist and their roles
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role 
ORDER BY count DESC;

-- 2. Check if get_course_enrollments RPC exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_all_users', 'get_course_enrollments');

-- 3. Test get_all_users directly
SELECT id, first_name, last_name, role FROM get_all_users();

-- 4. Check course enrollment_type values
SELECT id, title, enrollment_type FROM courses LIMIT 10;
