-- Migration: Auto-delete users inactive for 3+ days after last online session
-- Flow:
--   1. User has no online activity for 3 days (based on user_presence.last_seen)
--   2. deletion_scheduled_at is set to NOW() + 2 days (2-day warning window)
--   3. If user logs back in before that → deletion_scheduled_at is cleared
--   4. If 2 days pass without login → account is deleted

-- ─── Add deletion_scheduled_at to profiles ───────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN profiles.deletion_scheduled_at IS
  'When set, the account will be auto-deleted at this timestamp unless the user logs in first.';

-- ─── Function: flag inactive users (run daily via cron) ──────────────────────
-- Marks users whose last_seen > 3 days ago and have no deletion date yet.
-- Developers are always exempt.
CREATE OR REPLACE FUNCTION flag_inactive_users_for_deletion()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  flagged_count INTEGER;
BEGIN
  UPDATE profiles p
  SET
    deletion_scheduled_at = NOW() + INTERVAL '2 days',
    updated_at = NOW()
  FROM user_presence up
  WHERE p.id = up.user_id
    AND p.role != 'developer'
    AND p.deletion_scheduled_at IS NULL
    AND up.last_seen < NOW() - INTERVAL '3 days';

  GET DIAGNOSTICS flagged_count = ROW_COUNT;

  -- Also flag users who have no presence record at all and were created 5+ days ago
  UPDATE profiles p
  SET
    deletion_scheduled_at = NOW() + INTERVAL '2 days',
    updated_at = NOW()
  WHERE p.role != 'developer'
    AND p.deletion_scheduled_at IS NULL
    AND p.created_at < NOW() - INTERVAL '5 days'
    AND NOT EXISTS (
      SELECT 1 FROM user_presence up WHERE up.user_id = p.id
    );

  flagged_count := flagged_count + (SELECT COUNT(*) FROM profiles
    WHERE deletion_scheduled_at = NOW() + INTERVAL '2 days'
      AND updated_at >= NOW() - INTERVAL '1 second');

  RETURN json_build_object(
    'success', true,
    'flagged_count', flagged_count,
    'timestamp', NOW()
  );
END;
$$;

-- ─── Function: cancel deletion when user logs in ──────────────────────────────
CREATE OR REPLACE FUNCTION cancel_account_deletion(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET
    deletion_scheduled_at = NULL,
    updated_at = NOW()
  WHERE id = p_user_id
    AND deletion_scheduled_at IS NOT NULL;
END;
$$;

-- ─── Function: delete accounts whose window has expired (run daily via cron) ──
CREATE OR REPLACE FUNCTION delete_scheduled_accounts()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
  deleted_users JSON;
BEGIN
  SELECT json_agg(json_build_object(
    'id', id,
    'email', email,
    'first_name', first_name,
    'last_name', last_name,
    'role', role,
    'deletion_scheduled_at', deletion_scheduled_at
  ))
  INTO deleted_users
  FROM profiles
  WHERE deletion_scheduled_at IS NOT NULL
    AND deletion_scheduled_at <= NOW()
    AND role != 'developer';

  DELETE FROM profiles
  WHERE deletion_scheduled_at IS NOT NULL
    AND deletion_scheduled_at <= NOW()
    AND role != 'developer';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'deleted_users', COALESCE(deleted_users, '[]'::json),
    'timestamp', NOW()
  );
END;
$$;

-- ─── Function: get users currently in the deletion warning window ─────────────
CREATE OR REPLACE FUNCTION get_users_pending_deletion()
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  deletion_scheduled_at TIMESTAMPTZ,
  hours_remaining NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role::TEXT,
    p.deletion_scheduled_at,
    ROUND(EXTRACT(EPOCH FROM (p.deletion_scheduled_at - NOW())) / 3600, 1) AS hours_remaining
  FROM profiles p
  WHERE p.deletion_scheduled_at IS NOT NULL
    AND p.role != 'developer'
  ORDER BY p.deletion_scheduled_at ASC;
END;
$$;

-- ─── Trigger: clear deletion_scheduled_at when user_presence is updated ───────
-- This fires whenever a user's presence is refreshed (i.e. they're online)
CREATE OR REPLACE FUNCTION clear_deletion_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If last_seen is being updated to a recent time, cancel any pending deletion
  IF NEW.last_seen >= NOW() - INTERVAL '5 minutes' THEN
    UPDATE profiles
    SET deletion_scheduled_at = NULL, updated_at = NOW()
    WHERE id = NEW.user_id
      AND deletion_scheduled_at IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_deletion_on_activity ON user_presence;
CREATE TRIGGER trg_clear_deletion_on_activity
  AFTER INSERT OR UPDATE OF last_seen ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION clear_deletion_on_activity();
