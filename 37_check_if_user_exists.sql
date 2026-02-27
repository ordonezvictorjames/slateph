-- Check if brandnew@example.com exists
-- Date: February 27, 2026

-- Check in profiles
SELECT 'profiles' as table_name, id, email, role 
FROM profiles 
WHERE email = 'brandnew@example.com';

-- Check in auth.users
SELECT 'auth.users' as table_name, id, email 
FROM auth.users 
WHERE email = 'brandnew@example.com';

-- Try with a completely random email
SELECT create_user_account('Random', 'User', 'random' || floor(random() * 10000)::text || '@test.com', 'Pass123!', 'trainee'::user_role);
