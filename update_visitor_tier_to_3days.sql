-- Update Visitor tier from 2 days to 3 days
-- Run this in Supabase SQL Editor

-- Update the get_tier_duration function
CREATE OR REPLACE FUNCTION get_tier_duration(tier account_tier)
RETURNS INTEGER AS $$
BEGIN
    CASE tier
        WHEN 'visitor' THEN RETURN 3;
        WHEN 'beginner' THEN RETURN 7;
        WHEN 'intermediate' THEN RETURN 25;
        WHEN 'expert' THEN RETURN 30;
        WHEN 'vip' THEN RETURN NULL; -- Permanent
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update comment
COMMENT ON COLUMN profiles.account_tier IS 'Account tier determining duration: visitor(3d), beginner(7d), intermediate(25d), expert(30d), vip(permanent)';

-- Update existing visitor tier users to have 3 days duration
UPDATE profiles
SET 
    account_duration_days = 3,
    account_expires_at = created_at + INTERVAL '3 days'
WHERE account_tier = 'visitor'
  AND account_duration_days = 2;

-- Verify the update
SELECT 
    'Visitor tier updated to 3 days!' as status,
    COUNT(*) as affected_users
FROM profiles
WHERE account_tier = 'visitor' AND account_duration_days = 3;
