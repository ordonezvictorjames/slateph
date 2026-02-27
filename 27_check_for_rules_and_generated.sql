-- Check for rules and generated columns
-- Date: February 27, 2026

-- 1. Check if there are any rules on profiles
SELECT 
    rulename,
    definition
FROM pg_rules
WHERE tablename = 'profiles';

-- 2. Check for generated columns
SELECT 
    column_name,
    data_type,
    is_generated,
    generation_expression
FROM information_schema.columns
WHERE table_name = 'profiles'
AND is_generated = 'ALWAYS';

-- 3. Get the FULL table definition
SELECT 
    column_name,
    data_type,
    udt_name,
    column_default,
    is_nullable,
    is_generated
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Try a completely manual insert to isolate the problem
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
BEGIN
    -- Bypass the function entirely
    INSERT INTO profiles (id, first_name, last_name, email, role, status, created_at, updated_at)
    VALUES (test_id, 'Manual', 'Test', 'manual.test@example.com', 'trainee'::user_role, 'active', NOW(), NOW());
    
    RAISE NOTICE 'Manual insert SUCCESS! ID: %', test_id;
    
    -- Clean up
    DELETE FROM profiles WHERE id = test_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Manual insert FAILED: %', SQLERRM;
END $$;
