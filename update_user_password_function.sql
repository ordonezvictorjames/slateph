-- Function to update a user's password with automatic hashing
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSON AS $$
BEGIN
  UPDATE profiles
  SET password = crypt(p_new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'User not found');
  END IF;

  RETURN json_build_object('success', TRUE, 'message', 'Password updated successfully');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', FALSE, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_user_password TO authenticated;
