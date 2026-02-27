-- Fix the log_subject_deletion trigger to use peer_lead_id instead of instructor_id
-- and handle cases where user_id might not exist
CREATE OR REPLACE FUNCTION log_subject_deletion()
RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
  log_user_id UUID;
BEGIN
  -- Get course title
  SELECT title INTO course_title
  FROM courses
  WHERE id = OLD.course_id;

  -- Get a valid user_id (prefer auth.uid(), fallback to peer_lead_id, or skip if neither exists)
  log_user_id := COALESCE(auth.uid(), OLD.peer_lead_id);
  
  -- Only log if we have a valid user_id that exists in profiles
  IF log_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = log_user_id) THEN
    PERFORM log_activity(
      log_user_id,
      'subject_deleted',
      'Deleted subject: ' || OLD.title || ' (' || COALESCE(course_title, 'Unknown Course') || ')',
      jsonb_build_object(
        'deleted_subject_id', OLD.id,
        'deleted_subject_title', OLD.title,
        'deleted_subject_description', OLD.description,
        'course_id', OLD.course_id,
        'course_title', course_title,
        'instructor_id', OLD.peer_lead_id
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
