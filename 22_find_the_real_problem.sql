-- Find what's really causing the type error
-- Date: February 27, 2026

-- 1. Check if there are any rules on the profiles table
SELECT 
    schemaname,
    tablename,
    rulename,
    definition
FROM pg_rules
WHERE tablename = 'profiles';

-- 2. Check if profiles is actually a view
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'profiles';

-- 3. Try to see the actual INSERT statement that's failing
-- Let's test with a simple direct insert
DO $$
DECLARE
    test_id UUID := '00000000-0000-0000-0000-000000000001';
    test_role user_role := 'trainee';
BEGIN
    -- Try with a variable
    INSERT INTO profiles (id, first_name, last_name, email, role, status, created_at, updated_at)
    VALUES (test_id, 'Test', 'Direct', 'test.direct.var@example.com', test_role, 'active', NOW(), NOW());
    
    RAISE NOTICE 'Insert with variable worked!';
    DELETE FROM profiles WHERE id = test_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Insert with variable failed: %', SQLERRM;
END $$;

-- 4. Check all functions that might be called by triggers
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname LIKE '%log%'
OR p.proname LIKE '%profile%'
OR p.proname LIKE '%user%';
