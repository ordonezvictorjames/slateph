-- =============================================
-- DEBUG course_enrollments TABLE
-- Check current structure and data
-- =============================================

-- Show table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
ORDER BY ordinal_position;

-- Show indexes
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'course_enrollments';

-- Show row count
SELECT COUNT(*) as total_enrollments FROM course_enrollments;

-- Show sample data (if any exists)
SELECT * FROM course_enrollments LIMIT 5;
