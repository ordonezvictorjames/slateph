-- ============================================================
-- SLATE - All required database functions
-- Run AFTER schema_complete.sql
-- ============================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── authenticate_user ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.authenticate_user(
  user_email VARCHAR,
  user_password VARCHAR
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  SELECT * INTO v_user
  FROM public.profiles
  WHERE email = user_email
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid email or password');
  END IF;

  IF v_user.password IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Account not configured. Contact administrator.');
  END IF;

  IF v_user.password != crypt(user_password, v_user.password) THEN
    RETURN json_build_object('success', false, 'message', 'Invalid email or password');
  END IF;

  IF v_user.status != 'active' THEN
    RETURN json_build_object('success', false, 'message', 'Account is not active. Contact administrator.');
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Authentication successful',
    'user', json_build_object(
      'id',         v_user.id,
      'email',      v_user.email,
      'first_name', v_user.first_name,
      'last_name',  v_user.last_name,
      'role',       v_user.role,
      'avatar_url', v_user.avatar_url,
      'banner_url', v_user.banner_url,
      'status',     v_user.status
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Authentication error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_user TO anon, authenticated;

-- ── create_user_account ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_user_account(
  p_email      TEXT,
  p_first_name TEXT,
  p_last_name  TEXT,
  p_password   TEXT,
  p_role       TEXT DEFAULT 'guest'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_hashed  text;
  v_role    public.user_role;
BEGIN
  BEGIN
    v_role := p_role::public.user_role;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN json_build_object('success', false, 'message', 'Invalid role: ' || p_role);
  END;

  v_user_id := gen_random_uuid();
  v_hashed  := crypt(p_password, gen_salt('bf'));

  INSERT INTO public.profiles (
    id, email, first_name, last_name, role, password, status, created_at, updated_at
  ) VALUES (
    v_user_id, p_email, p_first_name, p_last_name, v_role, v_hashed, 'active', now(), now()
  );

  RETURN json_build_object(
    'success', true,
    'message', 'User account created successfully',
    'user', json_build_object(
      'id',         v_user_id,
      'email',      p_email,
      'first_name', p_first_name,
      'last_name',  p_last_name,
      'role',       v_role
    )
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'message', 'Email already exists');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Failed to create user: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_account TO anon, authenticated;

-- ── get_all_users ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
  id                    uuid,
  first_name            varchar,
  last_name             varchar,
  email                 varchar,
  role                  public.user_role,
  status                text,
  avatar_url            text,
  banner_url            text,
  strand                varchar,
  section               text,
  cluster               varchar,
  grade                 integer,
  batch_number          integer,
  account_tier          public.account_tier,
  account_expires_at    timestamptz,
  account_duration_days integer,
  last_login_at         timestamptz,
  created_at            timestamptz,
  updated_at            timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.first_name, p.last_name, p.email, p.role, p.status,
    p.avatar_url, p.banner_url, p.strand, p.section, p.cluster,
    p.grade, p.batch_number, p.account_tier, p.account_expires_at,
    p.account_duration_days, p.last_login_at, p.created_at, p.updated_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users TO anon, authenticated;

-- ── update_user_presence ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_user_presence(
  p_user_id uuid,
  p_status  text DEFAULT 'online'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_presence (user_id, status, last_seen, updated_at)
  VALUES (p_user_id, p_status, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET status     = p_status,
        last_seen  = now(),
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_presence TO anon, authenticated;

-- ── record_user_session ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_user_session(
  p_user_id    uuid,
  p_ip_address text    DEFAULT NULL,
  p_device_type text   DEFAULT NULL,
  p_browser    text    DEFAULT NULL,
  p_os         text    DEFAULT NULL,
  p_user_agent text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_sessions (
    user_id, ip_address, device_type, browser, os, user_agent,
    last_active, created_at, is_active
  ) VALUES (
    p_user_id, p_ip_address, p_device_type, p_browser, p_os, p_user_agent,
    now(), now(), true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_session TO anon, authenticated;

-- ── update_last_login ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_last_login(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_login_at = now(), updated_at = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_last_login TO anon, authenticated;

-- ── get_unread_notification_count ────────────────────────────
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.notifications
  WHERE user_id = p_user_id AND is_read = false;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO anon, authenticated;

-- ── validate_registration_code ───────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_registration_code(p_code varchar)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
BEGIN
  SELECT * INTO v_record
  FROM public.registration_codes
  WHERE code = UPPER(p_code)
    AND is_used = false
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired registration code');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Code is valid', 'code_id', v_record.id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error validating code: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_registration_code TO anon, authenticated;

-- ── mark_code_as_used ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_code_as_used(p_code varchar, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.registration_codes
  SET is_used = true, used_by = p_user_id, used_at = now()
  WHERE code = UPPER(p_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_code_as_used TO anon, authenticated;

-- ── Seed: insert a default registration code for first admin ─
-- Change 'SLATE1' to whatever code you want to hand out
INSERT INTO public.registration_codes (code, expires_at)
VALUES ('SLATE1', now() + interval '365 days')
ON CONFLICT (code) DO NOTHING;
