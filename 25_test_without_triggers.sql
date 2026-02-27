-- Test insert without triggers
-- Date: February 27, 2026

-- Disable all triggers on profiles table
ALTER TABLE profiles DISABLE TRIGGER ALL;

-- Test the function
SELECT create_user_account('Test', 'NoTrigger', 'test.notrigger@example.com', 'Pass123!', 'trainee');

-- Re-enable triggers
ALTER TABLE profiles ENABLE TRIGGER ALL;
