-- Test with completely new emails
-- Date: February 27, 2026

-- Test trainee
SELECT create_user_account('John', 'Trainee', 'john.trainee@example.com', 'Pass123!', 'trainee'::user_role);

-- Test instructor
SELECT create_user_account('Jane', 'Instructor', 'jane.instructor@example.com', 'Pass123!', 'instructor'::user_role);

-- Test admin
SELECT create_user_account('Admin', 'User', 'admin.user@example.com', 'Pass123!', 'admin'::user_role);

-- Verify they were created
SELECT id, first_name, last_name, email, role, status
FROM profiles
WHERE email IN ('john.trainee@example.com', 'jane.instructor@example.com', 'admin.user@example.com');
