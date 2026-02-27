-- =============================================
-- CREATE USER ACCOUNT DIRECTLY (NO VERIFICATION)
-- Simplified user creation without email verification
-- =============================================

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to create user account directly
CREATE OR REPLACE FUNCTION create_user_account(
  p_email VARCHAR,
  p_first_name VARCHAR,
  p_last_name VARCHAR,
  p_password VARCHAR,
  p_role VARCHAR
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'User with this email already exists'
    );
  END IF;
  
  -- Validate role
  IF p_role NOT IN ('admin', 'instructor', 'student', 'competitor', 'developer') THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Invalid role. Must be admin, instructor, student, competitor, or developer'
    );
  END IF;
  
  -- Hash the password using pgcrypto
  v_password_hash := crypt(p_password, gen_salt('bf'));
  
  -- Create user in profiles table (using 'password' column)
  -- Cast the role to user_role enum type
  EXECUTE format(
    'INSERT INTO profiles (first_name, last_name, email, password, role) 
     VALUES ($1, $2, $3, $4, $5::user_role) 
     RETURNING id'
  ) USING p_first_name, p_last_name, p_email, v_password_hash, p_role
  INTO v_user_id;
  
  -- Return success with user info
  RETURN json_build_object(
    'success', TRUE,
    'message', 'Account created successfully',
    'user', json_build_object(
      'id', v_user_id,
      'email', p_email,
      'first_name', p_first_name,
      'last_name', p_last_name,
      'role', p_role
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_user_account TO anon, authenticated;
