-- Create connections table if not exists
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_friend_id ON connections(friend_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- Disable RLS (custom auth, no auth.uid())
ALTER TABLE connections DISABLE ROW LEVEL SECURITY;

-- Grant table access to anon and authenticated
GRANT ALL ON connections TO anon, authenticated;

-- send_friend_request
CREATE OR REPLACE FUNCTION send_friend_request(p_user_id UUID, p_friend_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_existing connections;
BEGIN
    IF p_user_id = p_friend_id THEN
        RETURN json_build_object('success', false, 'message', 'Cannot add yourself as a friend');
    END IF;
    SELECT * INTO v_existing FROM connections
    WHERE (user_id = p_user_id AND friend_id = p_friend_id)
       OR (user_id = p_friend_id AND friend_id = p_user_id);
    IF FOUND THEN
        IF v_existing.status = 'accepted' THEN RETURN json_build_object('success', false, 'message', 'Already friends');
        ELSIF v_existing.status = 'pending' THEN RETURN json_build_object('success', false, 'message', 'Friend request already sent');
        ELSIF v_existing.status = 'blocked' THEN RETURN json_build_object('success', false, 'message', 'Cannot send friend request');
        END IF;
    END IF;
    INSERT INTO connections (user_id, friend_id, status) VALUES (p_user_id, p_friend_id, 'pending');
    RETURN json_build_object('success', true, 'message', 'Friend request sent');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- accept_friend_request
CREATE OR REPLACE FUNCTION accept_friend_request(p_user_id UUID, p_friend_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE connections SET status = 'accepted', updated_at = NOW()
    WHERE friend_id = p_user_id AND user_id = p_friend_id AND status = 'pending';
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Friend request not found'); END IF;
    RETURN json_build_object('success', true, 'message', 'Friend request accepted');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- reject_friend_request
CREATE OR REPLACE FUNCTION reject_friend_request(p_user_id UUID, p_friend_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM connections WHERE friend_id = p_user_id AND user_id = p_friend_id AND status = 'pending';
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Friend request not found'); END IF;
    RETURN json_build_object('success', true, 'message', 'Friend request rejected');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- remove_friend
CREATE OR REPLACE FUNCTION remove_friend(p_user_id UUID, p_friend_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM connections
    WHERE (user_id = p_user_id AND friend_id = p_friend_id)
       OR (user_id = p_friend_id AND friend_id = p_user_id);
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Connection not found'); END IF;
    RETURN json_build_object('success', true, 'message', 'Friend removed');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- get_connection_status
CREATE OR REPLACE FUNCTION get_connection_status(p_user_id UUID, p_other_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM connections
    WHERE (user_id = p_user_id AND friend_id = p_other_user_id)
       OR (user_id = p_other_user_id AND friend_id = p_user_id);
    IF NOT FOUND THEN RETURN 'none'; END IF;
    RETURN v_status;
END;
$$;

-- get_pending_requests
CREATE OR REPLACE FUNCTION get_pending_requests(p_user_id UUID)
RETURNS TABLE (id UUID, first_name TEXT, last_name TEXT, email TEXT, role TEXT, avatar_url TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.email, p.role::TEXT, p.avatar_url, c.created_at
    FROM connections c JOIN profiles p ON p.id = c.user_id
    WHERE c.friend_id = p_user_id AND c.status = 'pending'
    ORDER BY c.created_at DESC;
END;
$$;

-- get_friends (used as get_user_friends in some places)
CREATE OR REPLACE FUNCTION get_user_friends(p_user_id UUID)
RETURNS TABLE (id UUID, first_name TEXT, last_name TEXT, email TEXT, role TEXT, avatar_url TEXT, status TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.email, p.role::TEXT, p.avatar_url, c.status, c.created_at
    FROM connections c
    JOIN profiles p ON (CASE WHEN c.user_id = p_user_id THEN p.id = c.friend_id ELSE p.id = c.user_id END)
    WHERE (c.user_id = p_user_id OR c.friend_id = p_user_id) AND c.status = 'accepted'
    ORDER BY p.first_name, p.last_name;
END;
$$;

-- Grant execute to both anon and authenticated (custom auth uses anon key)
GRANT EXECUTE ON FUNCTION send_friend_request(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_friend_request(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reject_friend_request(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION remove_friend(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_connection_status(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_pending_requests(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_friends(UUID) TO anon, authenticated;

SELECT 'Friends system ready' AS status;
