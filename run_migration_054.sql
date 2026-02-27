-- Run this in Supabase SQL Editor to create the password reset request function
-- This allows unauthenticated users to request password resets

-- Create function to handle password reset requests
CREATE OR REPLACE FUNCTION request_password_reset(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_admin_record RECORD;
  v_notification_count INTEGER := 0;
BEGIN
  -- Check if email exists
  SELECT id, email, first_name, last_name
  INTO v_user_record
  FROM profiles
  WHERE email = p_email;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Email not found'
    );
  END IF;

  -- Insert notifications for all admins and developers
  FOR v_admin_record IN 
    SELECT id 
    FROM profiles 
    WHERE role IN ('admin', 'developer')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, is_read)
    VALUES (
      v_admin_record.id,
      'system_alert',
      'Password Reset Request',
      v_user_record.first_name || ' ' || v_user_record.last_name || ' (' || v_user_record.email || ') has requested a password reset.',
      false
    );
    
    v_notification_count := v_notification_count + 1;
  END LOOP;

  IF v_notification_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No administrators found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Password reset request sent to ' || v_notification_count || ' administrator(s)'
  );
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION request_password_reset(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION request_password_reset(TEXT) TO authenticated;
