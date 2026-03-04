-- =============================================
-- FIX course_enrollments COLUMN NAME
-- Ensure column is named correctly for application code
-- =============================================

-- Check current column name and rename if needed
DO $
BEGIN
    -- Check if student_id exists and rename to trainee_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'course_enrollments' 
        AND column_name = 'student_id'
    ) THEN
        ALTER TABLE course_enrollments RENAME COLUMN student_id TO trainee_id;
        DROP INDEX IF EXISTS idx_course_enrollments_student_id;
        CREATE INDEX idx_course_enrollments_trainee_id ON course_enrollments(trainee_id);
        RAISE NOTICE 'Renamed student_id to trainee_id';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'course_enrollments' 
        AND column_name = 'trainee_id'
    ) THEN
        RAISE NOTICE 'Column trainee_id already exists, no changes needed';
    ELSE
        RAISE EXCEPTION 'course_enrollments table does not have student_id or trainee_id column';
    END IF;
END $;

-- Update comments
COMMENT ON COLUMN course_enrollments.trainee_id IS 'Reference to the trainee profile';
COMMENT ON TABLE course_enrollments IS 'Tracks trainee enrollments in courses';
