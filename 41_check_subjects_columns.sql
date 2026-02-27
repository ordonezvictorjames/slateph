-- Check subjects table structure
-- Date: February 27, 2026

SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'subjects'
ORDER BY ordinal_position;
