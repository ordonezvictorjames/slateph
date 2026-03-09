-- Test friends system functions with actual user IDs
-- Replace 'YOUR_USER_ID' with an actual UUID from your profiles table

-- Step 1: Get some user IDs to test with
SELECT 
    id,
    first_name,
    last_name,
    email,
    role
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: Test get_user_friends function
-- Replace the UUID below with an actual user ID from Step 1
SELECT * FROM get_user_friends('REPLACE_WITH_ACTUAL_UUID');

-- Step 3: Test get_pending_requests function
-- Replace the UUID below with an actual user ID from Step 1
SELECT * FROM get_pending_requests('REPLACE_WITH_ACTUAL_UUID');

-- Step 4: Test get_connection_status function
-- Replace both UUIDs with actual user IDs from Step 1
SELECT get_connection_status('USER_1_UUID', 'USER_2_UUID');

-- Step 5: Check if connections table has any data
SELECT 
    c.*,
    p1.first_name || ' ' || p1.last_name as user_name,
    p2.first_name || ' ' || p2.last_name as friend_name
FROM connections c
LEFT JOIN profiles p1 ON p1.id = c.user_id
LEFT JOIN profiles p2 ON p2.id = c.friend_id
ORDER BY c.created_at DESC;

-- Step 6: Verify function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_friends',
    'get_pending_requests',
    'get_connection_status',
    'send_friend_request',
    'accept_friend_request',
    'reject_friend_request',
    'remove_friend'
  )
ORDER BY routine_name;

-- Step 7: Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'connections';

-- Step 8: Test sending a friend request (replace UUIDs)
-- SELECT send_friend_request('USER_1_UUID', 'USER_2_UUID');
