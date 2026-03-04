-- =============================================
-- CLEANUP DUPLICATE FOREIGN KEY CONSTRAINT
-- Remove old participant_id constraint, keep trainee_id
-- =============================================

-- Drop the old participant_id foreign key constraint
ALTER TABLE course_enrollments 
DROP CONSTRAINT IF EXISTS course_enrollments_participant_id_fkey;

-- Verify only one foreign key remains for trainee_id
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_name LIKE '%trainee_id%'
    AND table_name = 'course_enrollments'
    AND constraint_type = 'FOREIGN KEY';
    
    IF fk_count = 1 THEN
        RAISE NOTICE 'Successfully cleaned up - only one trainee_id foreign key remains';
    ELSE
        RAISE WARNING 'Expected 1 trainee_id foreign key, found %', fk_count;
    END IF;
END $$;

-- Show remaining foreign keys
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
