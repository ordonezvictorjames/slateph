-- Create user sessions tracking system for devices and IP addresses
-- RESTRICTED: Only Admin and Developer roles can view sessions
-- FIXED: Proper dollar-quoted string delimiters

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ip_address TEXT,
    device_type TEXT, -- mobile, tablet, desktop
    browser TEXT,
    os TEXT,
    device_name TEXT, -- User-friendly device name
    user_agent TEXT,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active ON user_sessions(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

-- Disable RLS (using custom auth)
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- Function to record or update session
CREATE OR REPLACE FUNCTION record_user_session(
    p_user_id UUID,
    p_ip_address TEXT,
    p_device_type TEXT,
    p_browser TEXT,
    p_os TEXT,
    p_user_agent TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
    v_device_name TEXT;
BEGIN
    -- Generate device name
    v_device_name := p_device_type || ' - ' || p_browser || ' on ' || p_os;
    
    -- Check if session exists for this device
    SELECT id INTO v_session_id
    FROM user_sessions
    WHERE user_id = p_user_id
      AND user_agent = p_user_agent
      AND is_active = TRUE
    ORDER BY last_active DESC
    LIMIT 1;
    
    IF v_session_id IS NOT NULL THEN
        -- Update existing session
        UPDATE user_sessions
        SET 
            ip_address = p_ip_address,
            last_active = NOW()
        WHERE id = v_session_id;
    ELSE
        -- Create new session
        INSERT INTO user_sessions (
            user_id, ip_address, device_type, browser, os, device_name, user_agent
        )
        VALUES (
            p_user_id, p_ip_address, p_device_type, p_browser, p_os, v_device_name, p_user_agent
        )
        RETURNING id INTO v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$;

-- Function to get user sessions (ADMIN/DEVELOPER ONLY)
CREATE OR REPLACE FUNCTION get_user_sessions(
    p_user_id UUID,
    p_requesting_user_id UUID,
    p_requesting_user_role TEXT,
    p_active_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    ip_address TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    device_name TEXT,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow Admin and Developer roles to view sessions
    IF p_requesting_user_role NOT IN ('admin', 'developer') THEN
        RAISE EXCEPTION 'Access denied: Only Admin and Developer roles can view user sessions';
    END IF;
    
    RETURN QUERY
    SELECT 
        s.id,
        s.ip_address,
        s.device_type,
        s.browser,
        s.os,
        s.device_name,
        s.last_active,
        s.created_at,
        s.is_active
    FROM user_sessions s
    WHERE s.user_id = p_user_id
      AND (NOT p_active_only OR s.is_active = TRUE)
    ORDER BY s.last_active DESC;
END;
$$;

-- Function to end session (ADMIN/DEVELOPER ONLY)
CREATE OR REPLACE FUNCTION end_user_session(
    p_session_id UUID,
    p_user_id UUID,
    p_requesting_user_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only allow Admin and Developer roles to end sessions
    IF p_requesting_user_role NOT IN ('admin', 'developer') THEN
        RAISE EXCEPTION 'Access denied: Only Admin and Developer roles can end user sessions';
    END IF;
    
    UPDATE user_sessions
    SET is_active = FALSE
    WHERE id = p_session_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- Function to end all sessions except current (ADMIN/DEVELOPER ONLY)
CREATE OR REPLACE FUNCTION end_all_other_sessions(
    p_user_id UUID,
    p_current_session_id UUID,
    p_requesting_user_role TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    -- Only allow Admin and Developer roles to end sessions
    IF p_requesting_user_role NOT IN ('admin', 'developer') THEN
        RAISE EXCEPTION 'Access denied: Only Admin and Developer roles can end user sessions';
    END IF;
    
    UPDATE user_sessions
    SET is_active = FALSE
    WHERE user_id = p_user_id 
      AND id != p_current_session_id
      AND is_active = TRUE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Grant permissions
GRANT ALL ON user_sessions TO authenticated;
GRANT ALL ON user_sessions TO anon;
GRANT EXECUTE ON FUNCTION record_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION record_user_session TO anon;
GRANT EXECUTE ON FUNCTION get_user_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_sessions TO anon;
GRANT EXECUTE ON FUNCTION end_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION end_user_session TO anon;
GRANT EXECUTE ON FUNCTION end_all_other_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION end_all_other_sessions TO anon;

SELECT 'User sessions tracking system created successfully! (Admin/Developer access only)' as status;