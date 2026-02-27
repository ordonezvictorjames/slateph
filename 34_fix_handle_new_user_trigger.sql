-- Fix the handle_new_user trigger to cast role properly
-- Date: February 27, 2026

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'trainee'::user_role),  -- Cast to enum!
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$;

-- Test the create_user_account function now
SELECT create_user_account('Test', 'Final', 'test.final@example.com', 'Pass123!', 'trainee'::user_role);
SELECT create_user_account('Test', 'Instructor', 'test.instructor.final@example.com', 'Pass123!', 'instructor'::user_role);
