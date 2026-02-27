-- Create function to create new users (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_role TEXT,
  p_status TEXT DEFAULT 'active',
  p_bio TEXT DEFAULT '',
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSON AS $function$
DECLARE
  new_user_id UUID;
  result JSON;
  v_role user_role;
BEGIN
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    result := json_build_object(
      'success', false,
      'message', 'Email already exists'
    );
    RETURN result;
  END IF;

  -- Cast role to proper enum type
  v_role := p_role::user_role;

  -- Insert new user with proper type casting
  INSERT INTO profiles (
    first_name,
    last_name,
    email,
    password,
    role,
    status,
    bio,
    avatar_url
  ) VALUES (
    p_first_name,
    p_last_name,
    p_email,
    p_password,
    v_role,
    p_status,
    p_bio,
    p_avatar_url
  )
  RETURNING id INTO new_user_id;

  -- Return success with user data
  result := json_build_object(
    'success', true,
    'user', json_build_object(
      'id', new_user_id,
      'first_name', p_first_name,
      'last_name', p_last_name,
      'email', p_email,
      'role', p_role,
      'status', p_status,
      'avatar_url', p_avatar_url
    )
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'message', SQLERRM
    );
    RETURN result;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get all users (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS SETOF profiles AS $function$
BEGIN
  RETURN QUERY
  SELECT * FROM profiles
  ORDER BY created_at DESC;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get all activity logs with user info (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_all_activity_logs()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  activity_type TEXT,
  description TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  user_first_name TEXT,
  user_last_name TEXT,
  user_email TEXT,
  user_role user_role,
  user_avatar_url TEXT
) AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.activity_type,
    al.description,
    al.metadata,
    al.ip_address,
    al.user_agent,
    al.created_at,
    p.first_name as user_first_name,
    p.last_name as user_last_name,
    p.email as user_email,
    p.role as user_role,
    p.avatar_url as user_avatar_url
  FROM activity_logs al
  LEFT JOIN profiles p ON al.user_id = p.id
  ORDER BY al.created_at DESC
  LIMIT 500;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_profile TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_activity_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_activity_logs TO anon;
