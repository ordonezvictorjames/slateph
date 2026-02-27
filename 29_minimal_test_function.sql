-- Minimal test - just insert into profiles, skip auth.users
-- Date: February 27, 2026

CREATE OR REPLACE FUNCTION test_profile_insert(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_role user_role
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
BEGIN
  -- Only insert into profiles, skip auth.users
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    email, 
    role,
    status, 
    created_at, 
    updated_at
  ) 
  VALUES (
    v_user_id, 
    p_first_name, 
    p_last_name, 
    p_email, 
    p_role,
    'active', 
    NOW(), 
    NOW()
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Profile created successfully',
    'user_id', v_user_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Test it
SELECT test_profile_insert('Test', 'Minimal', 'test.minimal@example.com', 'trainee'::user_role);

-- Clean up
DELETE FROM profiles WHERE email = 'test.minimal@example.com';
