-- =============================================
-- FIX USER ROLES AND CREATE USER FUNCTION
-- Add tesda_scholar to user_role enum and update create_user_account function
-- =============================================

-- Step 1: Add 'tesda_scholar' to user_role enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'tesda_scholar' 
        AND enumtypid = (
            SELECT oid 
            FROM pg_type 
            WHERE typname = 'user_role'
        )
    ) THEN
        ALTER TYPE user_role ADD VALUE 'tesda_scholar';
        RAISE NOTICE 'Added tesda_scholar to user_role enum';
    ELSE
        RAISE NOTICE 'tesda_scholar already exists in user_role enum';
    END IF;
END $$;

-- Step 2: Drop all existing versions of create_user_account function
DROP FUNCTION IF EXISTS create_user_account CASCADE;

-- Step 3: Create the updated create_user_account function to accept all valid roles
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
  
  -- Validate role (updated to include all current roles)
  IF p_role NOT IN ('admin', 'instructor', 'trainee', 'tesda_scholar', 'developer') THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Invalid role. Must be admin, instructor, trainee, tesda_scholar, or developer'
    );
  END IF;
  
  -- Hash the password using pgcrypto
  v_password_hash := crypt(p_password, gen_salt('bf'));
  
  -- Create user in profiles table
  INSERT INTO profiles (first_name, last_name, email, password, role, status) 
  VALUES (p_first_name, p_last_name, p_email, v_password_hash, p_role::user_role, 'active') 
  RETURNING id INTO v_user_id;
  
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
      'message', 'Error creating user: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_user_account TO anon, authenticated;

-- Step 3: Verify the changes
DO $$
BEGIN
    RAISE NOTICE 'User role enum values:';
    RAISE NOTICE '%', (
        SELECT string_agg(enumlabel::text, ', ' ORDER BY enumsortorder)
        FROM pg_enum
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    );
END $$;
