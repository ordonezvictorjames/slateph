-- CREATE CHAT TABLES FOR COURSE CHAT AND LOUNGE

-- ============================================
-- COURSE CHAT MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS course_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_chat_messages_course_id ON course_chat_messages(course_id);
CREATE INDEX IF NOT EXISTS idx_course_chat_messages_sender_id ON course_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_course_chat_messages_created_at ON course_chat_messages(created_at DESC);

-- Add comments
COMMENT ON TABLE course_chat_messages IS 'Chat messages for specific courses';
COMMENT ON COLUMN course_chat_messages.course_id IS 'Reference to the course this message belongs to';
COMMENT ON COLUMN course_chat_messages.sender_id IS 'User who sent the message';
COMMENT ON COLUMN course_chat_messages.message IS 'The message content';

-- ============================================
-- LOUNGE CHAT MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS lounge_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_lounge_chat_messages_sender_id ON lounge_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_lounge_chat_messages_created_at ON lounge_chat_messages(created_at DESC);

-- Add comments
COMMENT ON TABLE lounge_chat_messages IS 'General lounge chat messages accessible to all users';
COMMENT ON COLUMN lounge_chat_messages.sender_id IS 'User who sent the message';
COMMENT ON COLUMN lounge_chat_messages.message IS 'The message content';

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE course_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lounge_chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- COURSE CHAT POLICIES
-- ============================================

-- Policy: Users can view messages in courses they're enrolled in or teaching
CREATE POLICY "Users can view course chat messages"
    ON course_chat_messages
    FOR SELECT
    USING (
        -- User is enrolled in the course
        EXISTS (
            SELECT 1 FROM enrollments
            WHERE enrollments.course_id = course_chat_messages.course_id
            AND enrollments.user_id = auth.uid()
        )
        OR
        -- User is the instructor of the course
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = course_chat_messages.course_id
            AND courses.instructor_id = auth.uid()
        )
        OR
        -- User is admin or developer
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer')
        )
    );

-- Policy: Users can send messages in courses they're enrolled in or teaching
CREATE POLICY "Users can send course chat messages"
    ON course_chat_messages
    FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND (
            -- User is enrolled in the course
            EXISTS (
                SELECT 1 FROM enrollments
                WHERE enrollments.course_id = course_chat_messages.course_id
                AND enrollments.user_id = auth.uid()
            )
            OR
            -- User is the instructor of the course
            EXISTS (
                SELECT 1 FROM courses
                WHERE courses.id = course_chat_messages.course_id
                AND courses.instructor_id = auth.uid()
            )
            OR
            -- User is admin or developer
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'developer')
            )
        )
    );

-- Policy: Users can update their own messages
CREATE POLICY "Users can update their own course chat messages"
    ON course_chat_messages
    FOR UPDATE
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

-- Policy: Users can delete their own messages, or admins can delete any
CREATE POLICY "Users can delete their own course chat messages"
    ON course_chat_messages
    FOR DELETE
    USING (
        sender_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer')
        )
    );

-- ============================================
-- LOUNGE CHAT POLICIES
-- ============================================

-- Policy: All authenticated users can view lounge messages
CREATE POLICY "All users can view lounge chat messages"
    ON lounge_chat_messages
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Policy: All authenticated users can send lounge messages
CREATE POLICY "All users can send lounge chat messages"
    ON lounge_chat_messages
    FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND auth.uid() IS NOT NULL
    );

-- Policy: Users can update their own lounge messages
CREATE POLICY "Users can update their own lounge chat messages"
    ON lounge_chat_messages
    FOR UPDATE
    USING (sender_id = auth.uid())
    WITH CHECK (sender_id = auth.uid());

-- Policy: Users can delete their own lounge messages, or admins can delete any
CREATE POLICY "Users can delete their own lounge chat messages"
    ON lounge_chat_messages
    FOR DELETE
    USING (
        sender_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer')
        )
    );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get recent course chat messages
CREATE OR REPLACE FUNCTION get_course_chat_messages(
    p_course_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    course_id UUID,
    sender_id UUID,
    sender_name TEXT,
    sender_avatar TEXT,
    message TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ccm.id,
        ccm.course_id,
        ccm.sender_id,
        (p.first_name || ' ' || p.last_name) as sender_name,
        p.avatar_url as sender_avatar,
        ccm.message,
        ccm.created_at
    FROM course_chat_messages ccm
    JOIN profiles p ON p.id = ccm.sender_id
    WHERE ccm.course_id = p_course_id
    ORDER BY ccm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent lounge chat messages
CREATE OR REPLACE FUNCTION get_lounge_chat_messages(
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    sender_id UUID,
    sender_name TEXT,
    sender_avatar TEXT,
    message TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lcm.id,
        lcm.sender_id,
        (p.first_name || ' ' || p.last_name) as sender_name,
        p.avatar_url as sender_avatar,
        lcm.message,
        lcm.created_at
    FROM lounge_chat_messages lcm
    JOIN profiles p ON p.id = lcm.sender_id
    ORDER BY lcm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
    'Chat tables created successfully!' as status,
    'course_chat_messages and lounge_chat_messages are ready' as message;

-- Show table info
SELECT 
    'course_chat_messages' as table_name,
    COUNT(*) as message_count
FROM course_chat_messages
UNION ALL
SELECT 
    'lounge_chat_messages' as table_name,
    COUNT(*) as message_count
FROM lounge_chat_messages;
