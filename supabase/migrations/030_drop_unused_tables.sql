-- =============================================
-- DROP UNUSED TABLES
-- Remove tables that are no longer used in the application
-- =============================================

-- Drop subject_enrollments table (replaced by course_enrollments)
DROP TABLE IF EXISTS subject_enrollments CASCADE;

-- Drop activity_logs_simple view (not used, activity_logs_with_users is used instead)
DROP VIEW IF EXISTS activity_logs_simple CASCADE;

-- Drop batch_colors table (not used in the application)
DROP TABLE IF EXISTS batch_colors CASCADE;

-- Verify tables are dropped
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('subject_enrollments', 'batch_colors')
ORDER BY table_name;

-- Should return no rows if successfully removed
