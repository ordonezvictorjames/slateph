-- Create connections/friends system for user profiles

-- Create connections table
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_friend_id ON connections(friend_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- Create function to send friend request
CREATE OR REPLACE FUNCTION send_friend_request(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_connection connections;
BEGIN
    -- Check if users are the same
    IF p_user_id = p_friend_id THEN
        RETURN json_build_object('success', false, 'message', 'Cannot add yourself as a friend');
    END IF;

    -- Check if connection already exists
    SELECT * INTO v_existing_connection
    FROM connections
    WHERE (user_id = p_user_id AND friend_id = p_friend_id)
       OR (user_id = p_friend_id AND friend_id = p_user_id);

    IF FOUND THEN
        IF v_existing_connection.status = 'accepted' THEN
            RETURN json_build_object('success', false, 'message', 'Already friends');
        ELSIF v_existing_connection.status = 'pending' THEN
            RETURN json_build_object('success', false, 'message', 'Friend request already sent');
        ELSIF v_existing_connection.status = 'blocked' THEN
            RETURN json_build_object('success', false, 'message', 'Cannot send friend request');
        END IF;
    END IF;

    -- Create new friend request
    INSERT INTO connections (user_id, friend_id, status)
    VALUES (p_user_id, p_friend_id, 'pending');

    RETURN json_build_object('success', true, 'message', 'Friend request sent');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Create function to accept friend request
CREATE OR REPLACE FUNCTION accept_friend_request(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the connection status
    UPDATE connections
    SET status = 'accepted', updated_at = NOW()
    WHERE friend_id = p_user_id AND user_id = p_friend_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Friend request not found');
    END IF;

    RETURN json_build_object('success', true, 'message', 'Friend request accepted');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Create function to reject friend request
CREATE OR REPLACE FUNCTION reject_friend_request(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete the connection
    DELETE FROM connections
    WHERE friend_id = p_user_id AND user_id = p_friend_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Friend request not found');
    END IF;

    RETURN json_build_object('success', true, 'message', 'Friend request rejected');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Create function to remove friend
CREATE OR REPLACE FUNCTION remove_friend(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete the connection (works both ways)
    DELETE FROM connections
    WHERE (user_id = p_user_id AND friend_id = p_friend_id)
       OR (user_id = p_friend_id AND friend_id = p_user_id);

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Connection not found');
    END IF;

    RETURN json_build_object('success', true, 'message', 'Friend removed');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Create function to get user's friends
CREATE OR REPLACE FUNCTION get_user_friends(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    status TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        p.role::TEXT,
        p.avatar_url,
        c.status,
        c.created_at
    FROM connections c
    JOIN profiles p ON (
        CASE 
            WHEN c.user_id = p_user_id THEN p.id = c.friend_id
            ELSE p.id = c.user_id
        END
    )
    WHERE (c.user_id = p_user_id OR c.friend_id = p_user_id)
      AND c.status = 'accepted'
    ORDER BY p.first_name, p.last_name;
END;
$$;

-- Create function to get pending friend requests
CREATE OR REPLACE FUNCTION get_pending_requests(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.email,
        p.role::TEXT,
        p.avatar_url,
        c.created_at
    FROM connections c
    JOIN profiles p ON p.id = c.user_id
    WHERE c.friend_id = p_user_id
      AND c.status = 'pending'
    ORDER BY c.created_at DESC;
END;
$$;

-- Create function to check connection status between two users
CREATE OR REPLACE FUNCTION get_connection_status(
    p_user_id UUID,
    p_other_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status
    FROM connections
    WHERE (user_id = p_user_id AND friend_id = p_other_user_id)
       OR (user_id = p_other_user_id AND friend_id = p_user_id);

    IF NOT FOUND THEN
        RETURN 'none';
    END IF;

    RETURN v_status;
END;
$$;

-- Enable RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connections
CREATE POLICY "Users can view their own connections"
    ON connections FOR SELECT
    USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create their own connection requests"
    ON connections FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update connections they're part of"
    ON connections FOR UPDATE
    USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete their own connections"
    ON connections FOR DELETE
    USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Grant permissions
GRANT ALL ON connections TO authenticated;
GRANT EXECUTE ON FUNCTION send_friend_request TO authenticated;
GRANT EXECUTE ON FUNCTION accept_friend_request TO authenticated;
GRANT EXECUTE ON FUNCTION reject_friend_request TO authenticated;
GRANT EXECUTE ON FUNCTION remove_friend TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_friends TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_requests TO authenticated;
GRANT EXECUTE ON FUNCTION get_connection_status TO authenticated;

SELECT 'Connections system created successfully!' as status;
