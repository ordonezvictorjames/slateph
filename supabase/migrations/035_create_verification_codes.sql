-- =============================================
-- CREATE VERIFICATION CODES TABLE
-- Stores email verification codes for registration
-- =============================================

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  password_hash TEXT NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'instructor')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '15 minutes'),
  verified BOOLEAN DEFAULT FALSE,
  UNIQUE(email, code)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- Function to clean up expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes
  WHERE expires_at < NOW() OR verified = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate and store verification code
CREATE OR REPLACE FUNCTION generate_verification_code(
  p_email VARCHAR,
  p_first_name VARCHAR,
  p_last_name VARCHAR,
  p_password VARCHAR,
  p_user_type VARCHAR
)
RETURNS JSON AS $$
DECLARE
  v_code VARCHAR(6);
  v_password_hash TEXT;
BEGIN
  -- Clean up any existing codes for this email
  DELETE FROM verification_codes WHERE email = p_email;
  
  -- Generate random 6-character alphanumeric code
  v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6));
  
  -- Hash the password using pgcrypto
  v_password_hash := crypt(p_password, gen_salt('bf'));
  
  -- Store the verification code
  INSERT INTO verification_codes (email, code, first_name, last_name, password_hash, user_type)
  VALUES (p_email, v_code, p_first_name, p_last_name, v_password_hash, p_user_type);
  
  -- Return success with code (in production, send via email instead)
  RETURN json_build_object(
    'success', TRUE,
    'message', 'Verification code sent to email',
    'code', v_code,  -- This is returned for the API to send via email
    'expires_in_minutes', 15
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify code and create user
CREATE OR REPLACE FUNCTION verify_and_create_user(
  p_email VARCHAR,
  p_code VARCHAR
)
RETURNS JSON AS $$
DECLARE
  v_verification_record RECORD;
  v_user_id UUID;
  v_role VARCHAR(20);
BEGIN
  -- Find valid verification code
  SELECT * INTO v_verification_record
  FROM verification_codes
  WHERE email = p_email
    AND code = UPPER(p_code)
    AND expires_at > NOW()
    AND verified = FALSE
  LIMIT 1;
  
  -- Check if code exists and is valid
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Invalid or expired verification code'
    );
  END IF;
  
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'User with this email already exists'
    );
  END IF;
  
  -- Determine role based on user_type
  v_role := CASE 
    WHEN v_verification_record.user_type = 'instructor' THEN 'teacher'
    ELSE 'student'
  END;
  
  -- Create user in profiles table
  INSERT INTO profiles (
    first_name,
    last_name,
    email,
    password_hash,
    role
  ) VALUES (
    v_verification_record.first_name,
    v_verification_record.last_name,
    v_verification_record.email,
    v_verification_record.password_hash,
    v_role
  )
  RETURNING id INTO v_user_id;
  
  -- Mark verification code as used
  UPDATE verification_codes
  SET verified = TRUE
  WHERE id = v_verification_record.id;
  
  -- Return success with user info
  RETURN json_build_object(
    'success', TRUE,
    'message', 'Account created successfully',
    'user', json_build_object(
      'id', v_user_id,
      'email', v_verification_record.email,
      'first_name', v_verification_record.first_name,
      'last_name', v_verification_record.last_name,
      'role', v_role
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
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON verification_codes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_verification_code TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_and_create_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_verification_codes TO anon, authenticated;
