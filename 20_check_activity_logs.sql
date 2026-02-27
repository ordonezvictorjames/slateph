-- Check activity_logs table structure
-- Date: February 27, 2026

SELECT 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns
WHERE table_name = 'activity_logs' 
AND column_name IN ('metadata', 'description');
