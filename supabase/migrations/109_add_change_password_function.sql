-- =============================================
-- ADD CHANGE PASSWORD FUNCTION
-- Allows users to change their own password
-- =============================================

CREATE OR REPLACE FUNCTION change_user_password(
  p_user_id UUID,
  p_current_password TEXT,
  p_new_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_stored_hash TEXT;
  v_new_hash TEXT;
BEGIN
  -- Get current password hash
  SELECT password INTO v_stored_hash
  FROM profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  -- Verify current password using crypt
  IF v_stored_hash IS NULL OR v_stored_hash != crypt(p_current_password, v_stored_hash) THEN
    RETURN json_build_object('success', false, 'message', 'Current password is incorrect');
  END IF;

  -- Validate new password length
  IF length(p_new_password) < 8 THEN
    RETURN json_build_object('success', false, 'message', 'New password must be at least 8 characters');
  END IF;

  -- Hash new password and update
  v_new_hash := crypt(p_new_password, gen_salt('bf'));

  UPDATE profiles
  SET password = v_new_hash,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'Password changed successfully');

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION change_user_password TO anon, authenticated;
