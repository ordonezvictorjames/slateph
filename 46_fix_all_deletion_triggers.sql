-- Fix all deletion triggers to handle missing user_id gracefully

-- 1. Fix course deletion trigger
CREATE OR REPLACE FUNCTION log_course_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to log, but don't fail if it doesn't work
  BEGIN
    IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
      INSERT INTO activity_logs (user_id, activity_type, description, metadata)
      VALUES (
        auth.uid(),
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
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore logging errors
      NULL;
  END;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix subject deletion trigger
CREATE OR REPLACE FUNCTION log_subject_deletion()
RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
  log_user_id UUID;
BEGIN
  -- Try to log, but don't fail if it doesn't work
  BEGIN
    -- Get course title
    SELECT title INTO course_title FROM courses WHERE id = OLD.course_id;
    
    -- Get a valid user_id
    log_user_id := COALESCE(auth.uid(), OLD.peer_lead_id);
    
    IF log_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = log_user_id) THEN
      INSERT INTO activity_logs (user_id, activity_type, description, metadata)
      VALUES (
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
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore logging errors
      NULL;
  END;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix module deletion trigger (if it exists)
CREATE OR REPLACE FUNCTION log_module_deletion()
RETURNS TRIGGER AS $$
DECLARE
  subject_title TEXT;
  log_user_id UUID;
BEGIN
  -- Try to log, but don't fail if it doesn't work
  BEGIN
    -- Get subject title
    SELECT title INTO subject_title FROM subjects WHERE id = OLD.subject_id;
    
    log_user_id := auth.uid();
    
    IF log_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = log_user_id) THEN
      INSERT INTO activity_logs (user_id, activity_type, description, metadata)
      VALUES (
        log_user_id,
        'module_deleted',
        'Deleted module: ' || OLD.title || ' (' || COALESCE(subject_title, 'Unknown Subject') || ')',
        jsonb_build_object(
          'deleted_module_id', OLD.id,
          'deleted_module_title', OLD.title,
          'subject_id', OLD.subject_id,
          'subject_title', subject_title
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore logging errors
      NULL;
  END;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
