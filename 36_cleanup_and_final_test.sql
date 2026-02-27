-- Clean up test users and do final test
-- Date: February 27, 2026

-- Delete test users from profiles
DELETE FROM profiles WHERE email LIKE '%@example.com';

-- Delete test users from auth.users
DELETE FROM auth.users WHERE email LIKE '%@example.com';

-- Now test with fresh email
SELECT create_user_account('Brand', 'New', 'brandnew@example.com', 'Pass123!', 'trainee'::user_role);

-- Verify
SELECT id, first_name, last_name, email, role, status
FROM profiles
WHERE email = 'brandnew@example.com';
