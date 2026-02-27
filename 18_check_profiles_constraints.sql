-- Check for triggers, constraints, and the actual column type
-- Date: February 27, 2026

-- 1. Check the exact column definition
SELECT 
    column_name, 
    data_type, 
    udt_name,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name = 'role';

-- 2. Check for triggers on profiles table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- 3. Check for constraints
SELECT
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'profiles';

-- 4. Try a direct insert to see if it works
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO profiles (id, first_name, last_name, email, role, status, created_at, updated_at)
    VALUES (test_id, 'Direct', 'Test', 'direct.test@example.com', 'trainee'::user_role, 'active', NOW(), NOW());
    
    RAISE NOTICE 'Direct insert worked! User ID: %', test_id;
    
    -- Clean up
    DELETE FROM profiles WHERE id = test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Direct insert failed: %', SQLERRM;
END $$;
