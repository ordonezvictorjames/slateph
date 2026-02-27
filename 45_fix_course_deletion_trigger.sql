-- Fix the log_course_deletion trigger to handle cases where user_id might not exist
CREATE OR REPLACE FUNCTION log_course_deletion()
RETURNS TRIGGER AS $$
DECLARE
  log_user_id UUID;
BEGIN
  -- Get a valid user_id (use auth.uid() if available)
  log_user_id := auth.uid();
  
  -- Only log if we have a valid user_id that exists in profiles
  IF log_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = log_user_id) THEN
    PERFORM log_activity(
      log_user_id,
      'course_deleted',
      'Deleted course: ' || OLD.title,
      jsonb_build_object(
        'deleted_course_id', OLD.id,
        'deleted_course_title', OLD.title,
        'deleted_course_description', OLD.description,
        'course_type', OLD.course_type,
        'enrollment_type', OLD.enrollment_type
      )
    );
  END IF;
  
  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    -- If logging fails, don't block the deletion
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
