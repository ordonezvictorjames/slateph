-- Simplify create_user_account - let the database handle uniqueness
-- Date: February 27, 2026

-- Drop all versions
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure 
        FROM pg_proc 
        WHERE proname = 'create_user_account'
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.oid::regprocedure || ' CASCADE';
    END LOOP;
END $$;

-- Create simplified function
CREATE OR REPLACE FUNCTION create_user_account(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role user_role
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Create auth user - let trigger handle profile creation
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'first_name', p_first_name, 
      'last_name', p_last_name,
      'role', p_role::text
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Trigger will create profile automatically
  
  RETURN json_build_object(
    'success', true,
    'message', 'User created successfully',
    'user', json_build_object(
      'id', v_user_id,
      'email', p_email,
      'first_name', p_first_name,
      'last_name', p_last_name,
      'role', p_role::text
    )
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'message', 'User with this email already exists');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error creating user: ' || SQLERRM);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_account(TEXT, TEXT, TEXT, TEXT, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_account(TEXT, TEXT, TEXT, TEXT, user_role) TO anon;

-- Test
SELECT create_user_account('Final', 'Test', 'finaltest' || floor(random() * 10000)::text || '@test.com', 'Pass123!', 'trainee'::user_role);
