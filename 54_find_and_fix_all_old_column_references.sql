-- Find all functions that reference old column names
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE pg_get_functiondef(oid) LIKE '%participant_id%' 
   OR pg_get_functiondef(oid) LIKE '%peer_lead_id%';

-- Drop and recreate any enrollment-related triggers
DROP TRIGGER IF EXISTS log_enrollment_creation_trigger ON course_enrollments;
DROP TRIGGER IF EXISTS log_enrollment_deletion_trigger ON course_enrollments;
DROP TRIGGER IF EXISTS log_enrollment_update_trigger ON course_enrollments;

-- Recreate enrollment creation trigger
CREATE TRIGGER log_enrollment_creation_trigger
AFTER INSERT ON course_enrollments
FOR EACH ROW
EXECUTE FUNCTION log_enrollment_creation();

-- Recreate enrollment deletion trigger  
CREATE TRIGGER log_enrollment_deletion_trigger
BEFORE DELETE ON course_enrollments
FOR EACH ROW
EXECUTE FUNCTION log_enrollment_deletion();

-- Also check for any views or materialized views
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%participant_id%' 
   OR definition LIKE '%peer_lead_id%';
