-- =============================================
-- FIX ACTIVITY LOG TRIGGER FUNCTIONS
-- Make trigger functions run with SECURITY DEFINER to bypass RLS
-- =============================================

-- Recreate log_user_creation function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION log_user_creation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into activity_logs
  INSERT INTO activity_logs (
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    NEW.id,
    'user_registered',
    'New user registered: ' || NEW.first_name || ' ' || NEW.last_name,
    jsonb_build_object(
      'email', NEW.email,
      'role', NEW.role,
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

-- Recreate log_user_update function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION log_user_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only log if there are actual changes
  IF NEW.* IS DISTINCT FROM OLD.* THEN
    INSERT INTO activity_logs (
      user_id,
      activity_type,
      description,
      metadata
    ) VALUES (
      NEW.id,
      'user_updated',
      'User profile updated: ' || NEW.first_name || ' ' || NEW.last_name,
      jsonb_build_object(
        'email', NEW.email,
        'role', NEW.role,
        'updated_at', NEW.updated_at
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to log user update: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate log_user_deletion function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION log_user_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO activity_logs (
    user_id,
    activity_type,
    description,
    metadata
  ) VALUES (
    OLD.id,
    'user_deleted',
    'User deleted: ' || OLD.first_name || ' ' || OLD.last_name,
    jsonb_build_object(
      'email', OLD.email,
      'role', OLD.role,
      'deleted_at', NOW()
    )
  );
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to log user deletion: %', SQLERRM;
    RETURN OLD;
END;
$$;
