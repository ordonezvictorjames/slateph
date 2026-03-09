-- Create notifications system for friend requests

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'message', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    related_item_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Disable RLS (since we're using custom auth)
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_user_id UUID DEFAULT NULL,
    p_related_item_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, related_user_id, related_item_id)
    VALUES (p_user_id, p_type, p_title, p_message, p_related_user_id, p_related_item_id)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- Function to get user notifications
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_limit INT DEFAULT 20,
    p_unread_only BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    related_user_id UUID,
    related_user_name TEXT,
    related_user_avatar TEXT,
    related_item_id UUID,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.related_user_id,
        CASE 
            WHEN p.id IS NOT NULL THEN p.first_name || ' ' || p.last_name
            ELSE NULL
        END as related_user_name,
        p.avatar_url as related_user_avatar,
        n.related_item_id,
        n.is_read,
        n.created_at
    FROM notifications n
    LEFT JOIN profiles p ON p.id = n.related_user_id
    WHERE n.user_id = p_user_id
      AND (NOT p_unread_only OR n.is_read = FALSE)
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE notifications
    SET is_read = TRUE, updated_at = NOW()
    WHERE id = p_notification_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(
    p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    UPDATE notifications
    SET is_read = TRUE, updated_at = NOW()
    WHERE user_id = p_user_id AND is_read = FALSE;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(
    p_user_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM notifications
    WHERE user_id = p_user_id AND is_read = FALSE;
    
    RETURN v_count;
END;
$$;

-- Function to delete notification
CREATE OR REPLACE FUNCTION delete_notification(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM notifications
    WHERE id = p_notification_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

-- Update send_friend_request to create notification
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
    v_sender_name TEXT;
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

    -- Get sender name
    SELECT first_name || ' ' || last_name INTO v_sender_name
    FROM profiles
    WHERE id = p_user_id;

    -- Create new friend request
    INSERT INTO connections (user_id, friend_id, status)
    VALUES (p_user_id, p_friend_id, 'pending');

    -- Create notification for the recipient
    PERFORM create_notification(
        p_friend_id,
        'friend_request',
        'New Friend Request',
        v_sender_name || ' sent you a friend request',
        p_user_id,
        NULL
    );

    RETURN json_build_object('success', true, 'message', 'Friend request sent');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Update accept_friend_request to create notification
CREATE OR REPLACE FUNCTION accept_friend_request(
    p_user_id UUID,
    p_friend_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_accepter_name TEXT;
BEGIN
    -- Update the connection status
    UPDATE connections
    SET status = 'accepted', updated_at = NOW()
    WHERE friend_id = p_user_id AND user_id = p_friend_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Friend request not found');
    END IF;

    -- Get accepter name
    SELECT first_name || ' ' || last_name INTO v_accepter_name
    FROM profiles
    WHERE id = p_user_id;

    -- Create notification for the sender (friend who sent the request)
    PERFORM create_notification(
        p_friend_id,
        'friend_accepted',
        'Friend Request Accepted',
        v_accepter_name || ' accepted your friend request',
        p_user_id,
        NULL
    );

    RETURN json_build_object('success', true, 'message', 'Friend request accepted');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

-- Grant permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO anon;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO anon;
GRANT EXECUTE ON FUNCTION get_user_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_notifications TO anon;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO anon;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO anon;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO anon;
GRANT EXECUTE ON FUNCTION delete_notification TO authenticated;
GRANT EXECUTE ON FUNCTION delete_notification TO anon;

SELECT 'Notifications system created successfully!' as status;
