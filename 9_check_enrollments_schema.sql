-- Check the course_enrollments table schema
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'course_enrollments'
ORDER BY ordinal_position;
