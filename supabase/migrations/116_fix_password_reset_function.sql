-- Recreate request_password_reset with correct dollar-quoting ($$)
-- The original migration used $ which is invalid in PostgreSQL

CREATE OR REPLACE FUNCTION request_password_reset(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
  v_email TEXT;
  v_admin_id UUID;
  v_notification_count INTEGER := 0;
BEGIN
  -- Check if email exists
  SELECT id, first_name, last_name, email
  INTO v_user_id, v_first_name, v_last_name, v_email
  FROM profiles
  WHERE LOWER(profiles.email) = LOWER(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No account found with that email address'
    );
  END IF;

  -- Insert notifications for all admins and developers
  FOR v_admin_id IN
    SELECT id FROM profiles WHERE role IN ('admin', 'developer')
  LOOP
    INSERT INTO notifications (user_id, type, title, message, is_read)
    VALUES (
      v_admin_id,
      'system_alert',
      'Password Reset Request',
      v_first_name || ' ' || v_last_name || ' (' || v_email || ') has requested a password reset.',
      false
    );
    v_notification_count := v_notification_count + 1;
  END LOOP;

  IF v_notification_count = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No administrators available to process the request'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Password reset request sent to ' || v_notification_count || ' administrator(s)'
  );
END;
$$;

-- Ensure anon and authenticated can call it (needed since user is not logged in)
GRANT EXECUTE ON FUNCTION request_password_reset(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION request_password_reset(TEXT) TO authenticated;
