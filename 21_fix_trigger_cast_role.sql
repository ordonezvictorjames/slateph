-- Fix the log_user_creation trigger to cast role to text
-- Date: February 27, 2026

CREATE OR REPLACE FUNCTION log_user_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into activity_logs
  INSERT INTO activity_logs (
    user_id,
    activity_type,
    description,
    metadata
  ) 
  VALUES (
    NEW.id,
    'user_registered',
    'New user registered: ' || NEW.first_name || ' ' || NEW.last_name,
    jsonb_build_object(
      'email', NEW.email,
      'role', NEW.role::text,  -- Cast enum to text for JSONB
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the insert
    RAISE WARNING 'Failed to log user creation: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Test the create_user_account function again
SELECT create_user_account('Test', 'Trainee', 'test.trigger.fix@example.com', 'Pass123!', 'trainee');
