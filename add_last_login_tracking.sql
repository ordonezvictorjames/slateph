-- Add last_login_at column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing users to have current timestamp
UPDATE profiles 
SET last_login_at = NOW() 
WHERE last_login_at IS NULL;

-- Create function to update last login time
CREATE OR REPLACE FUNCTION update_last_login(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET last_login_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to delete accounts with no login for 3 days
CREATE OR REPLACE FUNCTION delete_inactive_login_accounts()
RETURNS TABLE(
  deleted_count INTEGER,
  deleted_users JSONB
) AS $$
DECLARE
  v_deleted_count INTEGER;
  v_deleted_users JSONB;
BEGIN
  -- Get list of users to be deleted (except developers)
  SELECT 
    COUNT(*)::INTEGER,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'last_login_at', last_login_at
      )
    )
  INTO v_deleted_count, v_deleted_users
  FROM profiles
  WHERE role != 'developer'
    AND last_login_at < NOW() - INTERVAL '3 days'
    AND status = 'active';

  -- Delete the accounts
  DELETE FROM profiles
  WHERE role != 'developer'
    AND last_login_at < NOW() - INTERVAL '3 days'
    AND status = 'active';

  -- Return results
  RETURN QUERY SELECT v_deleted_count, v_deleted_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_last_login(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_inactive_login_accounts() TO authenticated;

COMMENT ON COLUMN profiles.last_login_at IS 'Timestamp of user last login. Accounts with no login for 3 days will be deleted (except developers).';
COMMENT ON FUNCTION update_last_login(UUID) IS 'Updates the last login timestamp for a user';
COMMENT ON FUNCTION delete_inactive_login_accounts() IS 'Deletes accounts that have not logged in for 3 days (except developers)';
