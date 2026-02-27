-- Check the schema of course_enrollments table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'course_enrollments' 
AND table_schema = 'public'
ORDER BY ordinal_position;
