-- AUTO-DELETE INACTIVE ACCOUNTS AFTER 3 DAYS
-- Except Developer role accounts

-- Add column to track when account became inactive
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS inactive_since TIMESTAMPTZ;

COMMENT ON COLUMN profiles.inactive_since IS 'Timestamp when account status changed to inactive. Used for auto-deletion after 3 days.';

-- Function to update inactive_since timestamp when status changes
CREATE OR REPLACE FUNCTION track_inactive_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to inactive, set inactive_since
    IF NEW.status = 'inactive' AND (OLD.status IS NULL OR OLD.status != 'inactive') THEN
        NEW.inactive_since := NOW();
    END IF;
    
    -- If status changed from inactive to active, clear inactive_since
    IF NEW.status = 'active' AND OLD.status = 'inactive' THEN
        NEW.inactive_since := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track inactive status changes
DROP TRIGGER IF EXISTS track_inactive_status_trigger ON profiles;
CREATE TRIGGER track_inactive_status_trigger
    BEFORE UPDATE OF status ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION track_inactive_status();

-- Update existing inactive accounts to set inactive_since
UPDATE profiles
SET inactive_since = updated_at
WHERE status = 'inactive' 
  AND inactive_since IS NULL;

-- Function to delete inactive accounts after 3 days (except developers)
CREATE OR REPLACE FUNCTION delete_old_inactive_accounts()
RETURNS JSON AS $$
DECLARE
    deleted_count INTEGER;
    deleted_users JSON;
BEGIN
    -- Get list of accounts to be deleted for logging
    WITH accounts_to_delete AS (
        SELECT 
            id,
            email,
            first_name,
            last_name,
            role,
            inactive_since
        FROM profiles
        WHERE status = 'inactive'
          AND role != 'developer'
          AND inactive_since IS NOT NULL
          AND inactive_since < NOW() - INTERVAL '3 days'
    )
    SELECT json_agg(row_to_json(accounts_to_delete.*))
    INTO deleted_users
    FROM accounts_to_delete;
    
    -- Delete the accounts
    DELETE FROM profiles
    WHERE status = 'inactive'
      AND role != 'developer'
      AND inactive_since IS NOT NULL
      AND inactive_since < NOW() - INTERVAL '3 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'deleted_users', COALESCE(deleted_users, '[]'::json),
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get accounts that will be deleted soon
CREATE OR REPLACE FUNCTION get_accounts_pending_deletion(hours_threshold INTEGER DEFAULT 24)
RETURNS TABLE (
    id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role user_role,
    inactive_since TIMESTAMPTZ,
    hours_until_deletion INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.first_name,
        p.last_name,
        p.role,
        p.inactive_since,
        EXTRACT(HOUR FROM (
            (p.inactive_since + INTERVAL '3 days') - NOW()
        ))::INTEGER as hours_until_deletion
    FROM profiles p
    WHERE p.status = 'inactive'
      AND p.role != 'developer'
      AND p.inactive_since IS NOT NULL
      AND p.inactive_since < NOW() - INTERVAL '3 days' + (hours_threshold || ' hours')::INTERVAL
      AND p.inactive_since >= NOW() - INTERVAL '3 days'
    ORDER BY p.inactive_since ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually prevent deletion (reactivate account)
CREATE OR REPLACE FUNCTION prevent_account_deletion(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_role user_role;
BEGIN
    -- Reactivate the account
    UPDATE profiles
    SET 
        status = 'active',
        inactive_since = NULL,
        updated_at = NOW()
    WHERE id = p_user_id
    RETURNING role INTO v_role;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Account reactivated and deletion prevented',
        'user_id', p_user_id,
        'role', v_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification query
SELECT 
    'Inactive account deletion system installed!' as status,
    'Inactive accounts (except developers) will be deleted after 3 days' as policy;

-- Show current inactive accounts and their deletion timeline
SELECT 
    first_name,
    last_name,
    email,
    role,
    status,
    inactive_since,
    CASE 
        WHEN inactive_since IS NULL THEN 'N/A'
        WHEN inactive_since < NOW() - INTERVAL '3 days' THEN 'Ready for deletion'
        ELSE EXTRACT(DAY FROM ((inactive_since + INTERVAL '3 days') - NOW()))::TEXT || ' days until deletion'
    END as deletion_status
FROM profiles
WHERE status = 'inactive'
ORDER BY inactive_since ASC NULLS LAST;
