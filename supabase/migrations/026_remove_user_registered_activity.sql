-- =============================================
-- REMOVE USER_REGISTERED REDUNDANCY
-- Update trigger to only use 'user_created' activity type
-- =============================================

-- Temporarily disable the update trigger on activity_logs if it exists
DROP TRIGGER IF EXISTS update_activity_logs_updated_at ON activity_logs;

-- Update the log_user_creation function to only use 'user_created'
CREATE OR REPLACE FUNCTION log_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log user creation only (remove user_registered)
  PERFORM log_activity(
    NEW.id,
    'user_created',
    'Created new user: ' || COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.email),
    jsonb_build_object(
      'user_id', NEW.id,
      'email', NEW.email,
      'role', NEW.role,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update existing 'user_registered' entries to 'user_created' for consistency
UPDATE activity_logs 
SET activity_type = 'user_created',
    description = REPLACE(REPLACE(description, 'New user registered:', 'Created new user:'), 'User account created:', 'Created new user:')
WHERE activity_type = 'user_registered';

-- Update the check constraint to remove 'user_registered'
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_activity_type_check;

ALTER TABLE activity_logs 
ADD CONSTRAINT activity_logs_activity_type_check 
CHECK (activity_type IN (
  'login', 'logout', 'user_created', 'user_updated', 'user_deleted',
  'course_created', 'course_updated', 'course_deleted',
  'subject_created', 'subject_updated', 'subject_deleted',
  'module_created', 'module_updated', 'module_deleted',
  'enrollment_created', 'enrollment_updated', 'enrollment_deleted',
  'assignment_created', 'assignment_updated', 'assignment_deleted',
  'submission_created', 'submission_updated', 'submission_deleted',
  'grade_created', 'grade_updated', 'grade_deleted',
  'schedule_created', 'schedule_updated', 'schedule_deleted'
));

-- Verify the changes
SELECT 
  activity_type, 
  COUNT(*) as count 
FROM activity_logs 
WHERE activity_type LIKE '%user%'
GROUP BY activity_type
ORDER BY activity_type;
