-- =============================================
-- VERIFY AND FIX course_enrollments FOREIGN KEY
-- Ensure proper relationship with courses table
-- =============================================

-- Check current foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'course_enrollments';

-- Verify the foreign key exists, if not create it
DO $$
BEGIN
    -- Check if foreign key exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'course_enrollments_course_id_fkey'
        AND table_name = 'course_enrollments'
    ) THEN
        -- Add foreign key if missing
        ALTER TABLE course_enrollments
        ADD CONSTRAINT course_enrollments_course_id_fkey
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint for course_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;

    -- Check if foreign key for trainee_id exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'course_enrollments_trainee_id_fkey'
        AND table_name = 'course_enrollments'
    ) THEN
        -- Add foreign key if missing
        ALTER TABLE course_enrollments
        ADD CONSTRAINT course_enrollments_trainee_id_fkey
        FOREIGN KEY (trainee_id) REFERENCES profiles(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint for trainee_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;
