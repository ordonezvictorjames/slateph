-- Check if the connection exists between these two users
-- User 1: cab9985e-112b-44f0-b4a7-a259516b5f19
-- User 2: 0e9687c3-a777-4705-80d0-27353ca31fde

-- Check direction 1: User 1 -> User 2
SELECT 
    'Direction 1: User 1 -> User 2' as direction,
    *
FROM connections
WHERE user_id = 'cab9985e-112b-44f0-b4a7-a259516b5f19'
  AND friend_id = '0e9687c3-a777-4705-80d0-27353ca31fde';

-- Check direction 2: User 2 -> User 1
SELECT 
    'Direction 2: User 2 -> User 1' as direction,
    *
FROM connections
WHERE user_id = '0e9687c3-a777-4705-80d0-27353ca31fde'
  AND friend_id = 'cab9985e-112b-44f0-b4a7-a259516b5f19';

-- Check both directions with OR
SELECT 
    'Both directions' as search_type,
    *
FROM connections
WHERE (user_id = 'cab9985e-112b-44f0-b4a7-a259516b5f19' AND friend_id = '0e9687c3-a777-4705-80d0-27353ca31fde')
   OR (user_id = '0e9687c3-a777-4705-80d0-27353ca31fde' AND friend_id = 'cab9985e-112b-44f0-b4a7-a259516b5f19');

-- Show all connections for User 1
SELECT 
    'All connections for User 1' as info,
    c.*,
    p.first_name || ' ' || p.last_name as other_user
FROM connections c
LEFT JOIN profiles p ON (
    CASE 
        WHEN c.user_id = 'cab9985e-112b-44f0-b4a7-a259516b5f19' THEN p.id = c.friend_id
        ELSE p.id = c.user_id
    END
)
WHERE c.user_id = 'cab9985e-112b-44f0-b4a7-a259516b5f19'
   OR c.friend_id = 'cab9985e-112b-44f0-b4a7-a259516b5f19';
