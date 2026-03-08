-- Add account expiration fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS account_duration_days INTEGER DEFAULT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN profiles.account_expires_at IS 'When the account will expire and be automatically disabled';
COMMENT ON COLUMN profiles.account_duration_days IS 'Number of days the account is valid for (NULL = permanent)';

-- Set default durations by role
-- Guest accounts: 30 days
-- Student accounts: 365 days (1 year)
-- Scholar accounts: 730 days (2 years)
-- Admin, Developer, Instructor: permanent (NULL)

-- Update existing guest users to expire in 30 days from now
UPDATE profiles 
SET 
  account_duration_days = 30,
  account_expires_at = NOW() + INTERVAL '30 days'
WHERE role = 'guest' AND account_expires_at IS NULL;

-- Update existing student users to expire in 1 year from now
UPDATE profiles 
SET 
  account_duration_days = 365,
  account_expires_at = NOW() + INTERVAL '365 days'
WHERE role = 'student' AND account_expires_at IS NULL;

-- Update existing scholar users to expire in 2 years from now
UPDATE profiles 
SET 
  account_duration_days = 730,
  account_expires_at = NOW() + INTERVAL '730 days'
WHERE role = 'scholar' AND account_expires_at IS NULL;

-- Create function to automatically set expiration on account creation
CREATE OR REPLACE FUNCTION set_account_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expiration based on role
  CASE NEW.role
    WHEN 'guest' THEN
      NEW.account_duration_days := 30;
      NEW.account_expires_at := NOW() + INTERVAL '30 days';
    WHEN 'student' THEN
      NEW.account_duration_days := 365;
      NEW.account_expires_at := NOW() + INTERVAL '365 days';
    WHEN 'scholar' THEN
      NEW.account_duration_days := 730;
      NEW.account_expires_at := NOW() + INTERVAL '730 days';
    ELSE
      -- Admin, Developer, Instructor get permanent accounts
      NEW.account_duration_days := NULL;
      NEW.account_expires_at := NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to set expiration on insert
DROP TRIGGER IF EXISTS set_account_expiration_trigger ON profiles;
CREATE TRIGGER set_account_expiration_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_account_expiration();

-- Create function to check and disable expired accounts
CREATE OR REPLACE FUNCTION disable_expired_accounts()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Disable accounts that have expired
  UPDATE profiles
  SET status = 'inactive'
  WHERE account_expires_at IS NOT NULL
    AND account_expires_at < NOW()
    AND status = 'active';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to extend account duration
CREATE OR REPLACE FUNCTION extend_account_duration(
  p_user_id UUID,
  p_additional_days INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_new_expiration TIMESTAMPTZ;
BEGIN
  -- Extend the expiration date
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

-- Create function to get accounts expiring soon
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

-- Update the create_user_account function to include expiration
CREATE OR REPLACE FUNCTION create_user_account(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'guest'
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

    -- Set duration based on role
    CASE v_role
        WHEN 'guest' THEN
            v_duration_days := 30;
            v_expires_at := NOW() + INTERVAL '30 days';
        WHEN 'student' THEN
            v_duration_days := 365;
            v_expires_at := NOW() + INTERVAL '365 days';
        WHEN 'scholar' THEN
            v_duration_days := 730;
            v_expires_at := NOW() + INTERVAL '730 days';
        ELSE
            v_duration_days := NULL;
            v_expires_at := NULL;
    END CASE;

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

-- Verify the setup
SELECT 
  'Setup complete!' as status,
  'Guest accounts: 30 days' as guest_duration,
  'Student accounts: 365 days' as student_duration,
  'Scholar accounts: 730 days' as scholar_duration,
  'Admin/Developer/Instructor: Permanent' as permanent_roles;
