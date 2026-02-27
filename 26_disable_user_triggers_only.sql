-- Disable only user triggers, not system triggers
-- Date: February 27, 2026

-- Disable each user trigger individually
ALTER TABLE profiles DISABLE TRIGGER log_user_creation_trigger;
ALTER TABLE profiles DISABLE TRIGGER log_user_deletion_trigger;
ALTER TABLE profiles DISABLE TRIGGER log_user_update_trigger;
ALTER TABLE profiles DISABLE TRIGGER update_profiles_updated_at;

-- Test the function
SELECT create_user_account('Test', 'NoUserTrigger', 'test.nousertrigger@example.com', 'Pass123!', 'trainee');

-- Re-enable triggers
ALTER TABLE profiles ENABLE TRIGGER log_user_creation_trigger;
ALTER TABLE profiles ENABLE TRIGGER log_user_deletion_trigger;
ALTER TABLE profiles ENABLE TRIGGER log_user_update_trigger;
ALTER TABLE profiles ENABLE TRIGGER update_profiles_updated_at;
