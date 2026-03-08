-- COMPLETE ACCOUNT EXPIRATION AND TIER SYSTEM
-- Run this file in Supabase SQL Editor

-- ============================================
-- PART 1: Add Account Expiration Columns
-- ============================================

-- Add account expiration fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS account_duration_days INTEGER DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN profiles.account_expires_at IS 'When the account will expire and be automatically disabled';
COMMENT ON COLUMN profiles.account_duration_days IS 'Number of days the account is valid for (NULL = permanent)';

-- ============================================
-- PART 2: Create Account Tier System
-- ============================================

-- Create account_tier enum type
DO $$ BEGIN
    CREATE TYPE account_tier AS ENUM ('visitor', 'beginner', 'intermediate', 'expert', 'vip');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add account_tier column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_tier account_tier DEFAULT 'visitor';

COMMENT ON COLUMN profiles.account_tier IS 'Account tier determining duration: visitor(2d), beginner(7d), intermediate(25d), expert(30d), vip(permanent)';

-- ============================================
-- PART 3: Helper Functions
-- ============================================

-- Function to get duration days from tier
CREATE OR REPLACE FUNCTION get_tier_duration(tier account_tier)
RETURNS INTEGER AS $$
BEGIN
    CASE tier
        WHEN 'visitor' THEN RETURN 2;
        WHEN 'beginner' THEN RETURN 7;
        WHEN 'intermediate' THEN RETURN 25;
        WHEN 'expert' THEN RETURN 30;
        WHEN 'vip' THEN RETURN NULL; -- Permanent
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update account tier and recalculate expiration
CREATE OR REPLACE FUNCTION update_account_tier(
    p_user_id UUID,
    p_tier account_tier
)
RETURNS JSON AS $$
DECLARE
    v_duration_days INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Get duration for tier
    v_duration_days := get_tier_duration(p_tier);
    
    -- Calculate expiration (NULL for VIP)
    IF v_duration_days IS NULL THEN
        v_expires_at := NULL;
    ELSE
        v_expires_at := NOW() + (v_duration_days || ' days')::INTERVAL;
    END IF;
    
    -- Update user
    UPDATE profiles
    SET 
        account_tier = p_tier,
        account_duration_days = v_duration_days,
        account_expires_at = v_expires_at,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'User not found');
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Account tier updated',
        'tier', p_tier,
        'duration_days', v_duration_days,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable expired accounts
CREATE OR REPLACE FUNCTION disable_expired_accounts()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE profiles
  SET status = 'inactive'
  WHERE account_expires_at IS NOT NULL
    AND account_expires_at < NOW()
    AND status = 'active';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to extend account duration
CREATE OR REPLACE FUNCTION extend_account_duration(
  p_user_id UUID,
  p_additional_days INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_new_expiration TIMESTAMPTZ;
BEGIN
  UPDATE profiles
  SET 
    account_expires_at = COALESCE(account_expires_at, NOW()) + (p_additional_days || ' days')::INTERVAL,
    account_duration_days = COALESCE(account_duration_days, 0) + p_additional_days
  WHERE id = p_user_id
  RETURNING account_expires_at INTO v_new_expiration;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Account duration extended',
    'new_expiration', v_new_expiration
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get accounts expiring soon
CREATE OR REPLACE FUNCTION get_expiring_accounts(days_threshold INTEGER DEFAULT 7)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role user_role,
  account_expires_at TIMESTAMPTZ,
  days_until_expiration INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    p.account_expires_at,
    EXTRACT(DAY FROM (p.account_expires_at - NOW()))::INTEGER as days_until_expiration
  FROM profiles p
  WHERE p.account_expires_at IS NOT NULL
    AND p.account_expires_at > NOW()
    AND p.account_expires_at < NOW() + (days_threshold || ' days')::INTERVAL
    AND p.status = 'active'
  ORDER BY p.account_expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: Update Existing Users
-- ============================================

-- Set default tiers for existing users based on role
UPDATE profiles
SET account_tier = CASE
    WHEN role = 'guest' THEN 'visitor'::account_tier
    WHEN role = 'student' THEN 'expert'::account_tier
    WHEN role = 'scholar' THEN 'vip'::account_tier
    WHEN role IN ('admin', 'developer', 'instructor') THEN 'vip'::account_tier
    ELSE 'visitor'::account_tier
END
WHERE account_tier IS NULL;

-- Set expiration dates based on tier
UPDATE profiles
SET 
    account_duration_days = get_tier_duration(account_tier),
    account_expires_at = CASE 
        WHEN get_tier_duration(account_tier) IS NULL THEN NULL
        ELSE NOW() + (get_tier_duration(account_tier) || ' days')::INTERVAL
    END
WHERE account_expires_at IS NULL;

-- ============================================
-- PART 5: Triggers
-- ============================================

-- Create trigger function to set expiration on account creation
CREATE OR REPLACE FUNCTION set_account_expiration()
RETURNS TRIGGER AS $$
DECLARE
    v_duration_days INTEGER;
BEGIN
    -- If tier is not set, determine based on role
    IF NEW.account_tier IS NULL THEN
        CASE NEW.role
            WHEN 'guest' THEN NEW.account_tier := 'visitor';
            WHEN 'student' THEN NEW.account_tier := 'expert';
            WHEN 'scholar' THEN NEW.account_tier := 'vip';
            ELSE NEW.account_tier := 'vip';
        END CASE;
    END IF;
    
    -- Get duration from tier
    v_duration_days := get_tier_duration(NEW.account_tier);
    
    -- Set expiration
    NEW.account_duration_days := v_duration_days;
    IF v_duration_days IS NULL THEN
        NEW.account_expires_at := NULL;
    ELSE
        NEW.account_expires_at := NOW() + (v_duration_days || ' days')::INTERVAL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_account_expiration_trigger ON profiles;
CREATE TRIGGER set_account_expiration_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_account_expiration();

-- ============================================
-- PART 6: Update create_user_account Function
-- ============================================

CREATE OR REPLACE FUNCTION create_user_account(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'guest',
    p_tier account_tier DEFAULT 'visitor'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_password_hash TEXT;
    v_role user_role;
    v_duration_days INTEGER;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Map old roles to new roles and validate
    CASE p_role
        WHEN 'trainee' THEN v_role := 'student'::user_role;
        WHEN 'tesda_scholar' THEN v_role := 'scholar'::user_role;
        WHEN 'admin' THEN v_role := 'admin'::user_role;
        WHEN 'developer' THEN v_role := 'developer'::user_role;
        WHEN 'instructor' THEN v_role := 'instructor'::user_role;
        WHEN 'scholar' THEN v_role := 'scholar'::user_role;
        WHEN 'student' THEN v_role := 'student'::user_role;
        WHEN 'guest' THEN v_role := 'guest'::user_role;
        ELSE
            RETURN json_build_object('success', false, 'message', 'Invalid role');
    END CASE;

    -- Get duration from tier
    v_duration_days := get_tier_duration(p_tier);
    
    -- Calculate expiration
    IF v_duration_days IS NULL THEN
        v_expires_at := NULL;
    ELSE
        v_expires_at := NOW() + (v_duration_days || ' days')::INTERVAL;
    END IF;

    v_user_id := gen_random_uuid();
    v_password_hash := crypt(p_password, gen_salt('bf'));
    
    INSERT INTO profiles (
        id, 
        email, 
        first_name, 
        last_name, 
        role, 
        password_hash, 
        status, 
        account_tier,
        account_duration_days,
        account_expires_at,
        created_at, 
        updated_at
    ) VALUES (
        v_user_id, 
        p_email, 
        p_first_name, 
        p_last_name, 
        v_role, 
        v_password_hash, 
        'active',
        p_tier,
        v_duration_days,
        v_expires_at,
        NOW(), 
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'User account created successfully',
        'user', json_build_object(
            'id', v_user_id,
            'email', p_email,
            'first_name', p_first_name,
            'last_name', p_last_name,
            'role', v_role,
            'account_tier', p_tier,
            'account_duration_days', v_duration_days,
            'account_expires_at', v_expires_at
        )
    );
    
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'message', 'Email already exists');
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
    'Setup complete!' as status,
    'Account expiration and tier system installed' as message;

-- Show tier configuration
SELECT 
    'Visitor: 2 days' as tier_1,
    'Beginner: 7 days' as tier_2,
    'Intermediate: 25 days' as tier_3,
    'Expert: 30 days' as tier_4,
    'VIP: Permanent' as tier_5;

-- Show user counts by tier
SELECT 
    account_tier,
    COUNT(*) as user_count,
    COUNT(CASE WHEN account_expires_at < NOW() THEN 1 END) as expired_count
FROM profiles
GROUP BY account_tier
ORDER BY 
    CASE account_tier
        WHEN 'visitor' THEN 1
        WHEN 'beginner' THEN 2
        WHEN 'intermediate' THEN 3
        WHEN 'expert' THEN 4
        WHEN 'vip' THEN 5
    END;
