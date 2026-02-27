-- =============================================
-- CREATE AUTHENTICATE USER FUNCTION
-- Validates user credentials and returns user data
-- =============================================

-- Drop all existing versions of authenticate_user function
DROP FUNCTION IF EXISTS authenticate_user CASCADE;
DROP FUNCTION IF EXISTS authenticate_user(VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS authenticate_user(TEXT, TEXT) CASCADE;

-- Function to authenticate user with email and password
CREATE FUNCTION authenticate_user(
  user_email VARCHAR,
  user_password VARCHAR
)
RETURNS JSON AS $$
DECLARE
  v_user RECORD;
  v_password_match BOOLEAN;
BEGIN
  -- Find user by email
  SELECT * INTO v_user
  FROM profiles
  WHERE email = user_email
  LIMIT 1;

  -- Check if user exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Invalid email or password'
    );
  END IF;

  -- Check if user has a password set
  IF v_user.password IS NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Account not properly configured. Please contact administrator.'
    );
  END IF;

  -- Verify password using pgcrypto's crypt function
  -- crypt(password, stored_hash) returns the stored_hash if password matches
  v_password_match := (v_user.password = crypt(user_password, v_user.password));

  -- Check if password matches
  IF NOT v_password_match THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Invalid email or password'
    );
  END IF;

  -- Check if user account is active
  IF v_user.status != 'active' THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Account is not active. Please contact administrator.'
    );
  END IF;

  -- Return success with user data
  RETURN json_build_object(
    'success', TRUE,
    'message', 'Authentication successful',
    'user', json_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'first_name', v_user.first_name,
      'last_name', v_user.last_name,
      'role', v_user.role,
      'avatar_url', v_user.avatar_url,
      'banner_url', v_user.banner_url,
      'spotify_url', v_user.spotify_url,
      'status', v_user.status
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Authentication error: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION authenticate_user TO anon, authenticated;
