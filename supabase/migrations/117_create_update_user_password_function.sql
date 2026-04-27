-- Admin function to update any user's password (no current password required)
-- Used by admins/developers in UserManagementPage

DO $outer$
BEGIN
  EXECUTE $func$
    CREATE OR REPLACE FUNCTION public.update_user_password(
      p_user_id    UUID,
      p_new_password TEXT
    )
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      v_new_hash TEXT;
    BEGIN
      IF length(p_new_password) < 6 THEN
        RETURN json_build_object('success', false, 'message', 'Password must be at least 6 characters');
      END IF;

      -- Hash using pgcrypto
      v_new_hash := crypt(p_new_password, gen_salt('bf'));

      UPDATE public.profiles
      SET password_hash = v_new_hash,
          updated_at    = NOW()
      WHERE id = p_user_id;

      IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
      END IF;

      RETURN json_build_object('success', true, 'message', 'Password updated successfully');
    EXCEPTION
      WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', SQLERRM);
    END;
    $body$
  $func$;
END;
$outer$;

GRANT EXECUTE ON FUNCTION public.update_user_password(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.update_user_password(UUID, TEXT) TO authenticated;
