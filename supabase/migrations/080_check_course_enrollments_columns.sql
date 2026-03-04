-- =============================================
-- CHECK course_enrollments TABLE COLUMNS
-- Verify what columns actually exist
-- =============================================

-- Show all columns in course_enrollments table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
ORDER BY ordinal_position;
