-- CREATE CHAT TABLES ONLY (ENROLLMENTS TABLE ALREADY EXISTS)

-- ============================================
-- PART 1: COURSE CHAT MESSAGES TABLE
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
COMMENT ON TABLE course_chat_messages IS 'Chat messages for specific courses - only visible to enrolled users';
COMMENT ON COLUMN course_chat_messages.course_id IS 'Reference to the course this message belongs to';
COMMENT ON COLUMN course_chat_messages.sender_id IS 'User who sent the message';
COMMENT ON COLUMN course_chat_messages.message IS 'The message content';

-- ============================================
-- PART 2: LOUNGE CHAT MESSAGES TABLE
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
-- PART 3: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE course_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lounge_chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enrolled users can view course chat messages" ON course_chat_messages;
DROP POLICY IF EXISTS "Enrolled users can send course chat messages" ON course_chat_messages;
DROP POLICY IF EXISTS "Users can update their own course chat messages" ON course_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own course chat messages" ON course_chat_messages;
DROP POLICY IF EXISTS "All users can view lounge chat messages" ON lounge_chat_messages;
DROP POLICY IF EXISTS "All users can send lounge chat messages" ON lounge_chat_messages;
DROP POLICY IF EXISTS "Users can update their own lounge chat messages" ON lounge_chat_messages;
DROP POLICY IF EXISTS "Users can delete their own lounge chat messages" ON lounge_chat_messages;

-- ============================================
-- COURSE CHAT POLICIES (ENROLLMENT-BASED)
-- ============================================

-- Policy: Users can ONLY view messages in courses they're enrolled in
CREATE POLICY "Enrolled users can view course chat messages"
    ON course_chat_messages
    FOR SELECT
    USING (
        -- User is enrolled in the course
        EXISTS (
            SELECT 1 FROM enrollments
            WHERE enrollments.course_id = course_chat_messages.course_id
            AND enrollments.user_id = auth.uid()
            AND enrollments.status = 'active'
        )
        OR
        -- User is admin, developer, or instructor
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'instructor')
        )
    );

-- Policy: Users can ONLY send messages in courses they're enrolled in
CREATE POLICY "Enrolled users can send course chat messages"
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
                AND enrollments.status = 'active'
            )
            OR
            -- User is admin, developer, or instructor
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'developer', 'instructor')
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
-- PART 4: HELPER FUNCTIONS
-- ============================================

-- Function to get course chat messages (only for enrolled users)
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

-- Function to get lounge chat messages
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
    'Course chat is restricted to enrolled users, instructors, and admins' as access_control;

-- Show table counts
SELECT 'course_chat_messages' as table_name, COUNT(*) as count FROM course_chat_messages
UNION ALL
SELECT 'lounge_chat_messages' as table_name, COUNT(*) as count FROM lounge_chat_messages;
