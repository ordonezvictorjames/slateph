-- Recreate request_password_reset with correct dollar-quoting ($$)
-- The original migration used $ which is invalid in PostgreSQL

CREATE OR REPLACE FUNCTION request_password_reset(p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_first_name TEXT;
  v_last_name  TEXT;
  v_email      TEXT;
  v_count      INTEGER;
BEGIN
  SELECT id, first_name, last_name, email
  INTO v_user_id, v_first_name, v_last_name, v_email
  FROM public.profiles
  WHERE LOWER(email) = LOWER(p_email)
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'No account found with that email address');
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, is_read)
  SELECT
    p.id,
    'system_alert',
    'Password Reset Request',
    v_first_name || ' ' || v_last_name || ' (' || v_email || ') has requested a password reset.',
    false
  FROM public.profiles p
  WHERE p.role IN ('admin', 'developer');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN json_build_object('success', false, 'message', 'No administrators available');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Request sent to ' || v_count || ' administrator(s)');
END;
$$;

GRANT EXECUTE ON FUNCTION request_password_reset(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION request_password_reset(TEXT) TO authenticated;
