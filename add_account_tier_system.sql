-- Create account_tier enum type
DO $$ BEGIN
    CREATE TYPE account_tier AS ENUM ('visitor', 'beginner', 'intermediate', 'expert', 'vip');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add account_tier column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_tier account_tier DEFAULT 'visitor';

-- Add comment
COMMENT ON COLUMN profiles.account_tier IS 'Account tier determining duration: visitor(2d), beginner(7d), intermediate(25d), expert(30d), vip(permanent)';

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

-- Update existing users to have a tier based on their current duration
UPDATE profiles
SET account_tier = CASE
    WHEN account_duration_days IS NULL THEN 'vip'::account_tier
    WHEN account_duration_days <= 2 THEN 'visitor'::account_tier
    WHEN account_duration_days <= 7 THEN 'beginner'::account_tier
    WHEN account_duration_days <= 25 THEN 'intermediate'::account_tier
    WHEN account_duration_days <= 30 THEN 'expert'::account_tier
    ELSE 'vip'::account_tier
END
WHERE account_tier IS NULL;

-- Update the trigger function to use tier
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

-- Update create_user_account to use tier
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

-- Verify setup
SELECT 
    'Account tier system installed!' as status,
    'Visitor: 2 days' as visitor,
    'Beginner: 7 days' as beginner,
    'Intermediate: 25 days' as intermediate,
    'Expert: 30 days' as expert,
    'VIP: Permanent' as vip;
