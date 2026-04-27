-- Recreate request_password_reset with correct dollar-quoting ($$)
-- The original migration used $ which is invalid in PostgreSQL

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
  WHERE LOWER(email) = LOWER(p_email);

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No account found with that email address'
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
      v_user_record.first_name || ' ' || v_user_record.last_name ||
        ' (' || v_user_record.email || ') has requested a password reset.',
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
