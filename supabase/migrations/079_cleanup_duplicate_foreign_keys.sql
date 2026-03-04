-- =============================================
-- CLEANUP DUPLICATE FOREIGN KEYS
-- Remove old participant_id foreign key constraint
-- =============================================

-- Drop the old participant_id foreign key constraint
ALTER TABLE course_enrollments 
DROP CONSTRAINT IF EXISTS course_enrollments_participant_id_fkey;

-- Verify only one foreign key remains for trainee_id
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
    AND tc.table_name = 'course_enrollments'
ORDER BY tc.constraint_name;
