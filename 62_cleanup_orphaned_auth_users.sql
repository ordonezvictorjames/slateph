-- Step 1: Find auth.users that don't have corresponding profiles (orphaned accounts)
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.deleted_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;

-- Step 2: Clean up all orphaned users at once
-- This will delete the 6 orphaned auth.users records found above
DELETE FROM auth.users 
WHERE id IN (
    SELECT au.id
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL
);

-- Step 3: Verify cleanup - should return 0 rows
SELECT 
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL;
