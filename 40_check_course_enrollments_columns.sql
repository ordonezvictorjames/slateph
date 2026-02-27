-- Check course_enrollments table structure
-- Date: February 27, 2026

SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'course_enrollments'
ORDER BY ordinal_position;
