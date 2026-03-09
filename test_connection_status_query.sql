-- Test the connection status query
-- Replace USER_1_UUID and USER_2_UUID with actual UUIDs from your profiles table

-- First, get some user IDs
SELECT id, first_name, last_name, email
FROM profiles
ORDER BY created_at DESC
LIMIT 5;

-- Test 1: Check if any connections exist
SELECT * FROM connections ORDER BY created_at DESC LIMIT 10;

-- Test 2: Test the OR query format (replace UUIDs)
-- This is the query used in checkConnectionStatus
SELECT status
FROM connections
WHERE (user_id = 'USER_1_UUID' AND friend_id = 'USER_2_UUID')
   OR (user_id = 'USER_2_UUID' AND friend_id = 'USER_1_UUID');

-- Test 3: Alternative query format (simpler)
SELECT status
FROM connections
WHERE (user_id IN ('USER_1_UUID', 'USER_2_UUID'))
  AND (friend_id IN ('USER_1_UUID', 'USER_2_UUID'))
  AND user_id != friend_id;

-- Test 4: Send a test friend request
-- SELECT send_friend_request('USER_1_UUID', 'USER_2_UUID');

-- Test 5: Check if the connection was created
SELECT 
    c.*,
    p1.first_name || ' ' || p1.last_name as sender,
    p2.first_name || ' ' || p2.last_name as receiver
FROM connections c
JOIN profiles p1 ON p1.id = c.user_id
JOIN profiles p2 ON p2.id = c.friend_id
WHERE c.status = 'pending'
ORDER BY c.created_at DESC;
