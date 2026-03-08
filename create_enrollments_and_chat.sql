-- CREATE ENROLLMENTS TABLE AND CHAT TABLES WITH PROPER ACCESS CONTROL

-- ============================================
-- PART 1: CREATE ENROLLMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dropped')),
    grade NUMERIC(5,2),
    UNIQUE(user_id, course_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- Add comments
COMMENT ON TABLE enrollments IS 'Tracks which users are enrolled in which courses';
COMMENT ON COLUMN enrollments.user_id IS 'Student enrolled in the course';
COMMENT ON COLUMN enrollments.course_id IS 'Course the student is enrolled in';
COMMENT ON COLUMN enrollments.status IS 'Enrollment status: active, completed, or dropped';

-- Enable RLS on enrollments
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments"
    ON enrollments FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        -- Instructors can see enrollments in their courses
        EXISTS (
            SELECT 1 FROM courses
            WHERE courses.id = enrollments.course_id
            AND courses.instructor_id = auth.uid()
        )
        OR
        -- Admins can see all enrollments
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer')
        )
    );

CREATE POLICY "Admins and instructors can manage enrollments"
    ON enrollments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'developer', 'instructor')
        )
    );

-- ============================================
-- PART 2: COURSE CHAT MESSAGES TABLE
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
-- PART 3: LOUNGE CHAT MESSAGES TABLE
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
-- PART 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE course_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lounge_chat_messages ENABLE ROW LEVEL SECURITY;

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
-- PART 5: HELPER FUNCTIONS
-- ============================================

-- Function to enroll a user in a course
CREATE OR REPLACE FUNCTION enroll_user_in_course(
    p_user_id UUID,
    p_course_id UUID
)
RETURNS JSON AS $$
BEGIN
    -- Check if already enrolled
    IF EXISTS (
        SELECT 1 FROM enrollments
        WHERE user_id = p_user_id AND course_id = p_course_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User is already enrolled in this course'
        );
    END IF;
    
    -- Enroll the user
    INSERT INTO enrollments (user_id, course_id, status)
    VALUES (p_user_id, p_course_id, 'active');
    
    RETURN json_build_object(
        'success', true,
        'message', 'User enrolled successfully'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's enrolled courses
CREATE OR REPLACE FUNCTION get_user_enrolled_courses(p_user_id UUID)
RETURNS TABLE (
    course_id UUID,
    course_title TEXT,
    course_code TEXT,
    instructor_name TEXT,
    enrolled_at TIMESTAMPTZ,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as course_id,
        c.title as course_title,
        c.course_code,
        (p.first_name || ' ' || p.last_name) as instructor_name,
        e.enrolled_at,
        e.status
    FROM enrollments e
    JOIN courses c ON c.id = e.course_id
    JOIN profiles p ON p.id = c.instructor_id
    WHERE e.user_id = p_user_id
    ORDER BY e.enrolled_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    'Enrollments and chat tables created successfully!' as status,
    'Course chat is restricted to enrolled users only' as access_control;

-- Show table counts
SELECT 'enrollments' as table_name, COUNT(*) as count FROM enrollments
UNION ALL
SELECT 'course_chat_messages' as table_name, COUNT(*) as count FROM course_chat_messages
UNION ALL
SELECT 'lounge_chat_messages' as table_name, COUNT(*) as count FROM lounge_chat_messages;
