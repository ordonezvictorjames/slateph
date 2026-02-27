-- Verify the create_user_account function exists and test it
-- Date: February 27, 2026

-- 1. Check if function exists
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'create_user_account'
AND n.nspname = 'public';

-- 2. Check enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- 3. Test the function with a trainee role
SELECT create_user_account(
    'Test', 
    'Trainee', 
    'test.trainee@example.com', 
    'Pass123!', 
    'trainee'
);

-- 4. Test the function with an instructor role
SELECT create_user_account(
    'Test', 
    'Instructor', 
    'test.instructor@example.com', 
    'Pass123!', 
    'instructor'
);

-- 5. Check if the users were created in profiles
SELECT id, first_name, last_name, email, role, status
FROM profiles
WHERE email IN ('test.trainee@example.com', 'test.instructor@example.com');
