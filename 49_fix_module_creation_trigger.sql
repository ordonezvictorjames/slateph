-- Fix the log_module_creation trigger to handle missing user_id gracefully
CREATE OR REPLACE FUNCTION log_module_creation()
RETURNS TRIGGER AS $$
DECLARE
  subject_title TEXT;
  log_user_id UUID;
BEGIN
  -- Try to log, but don't fail if it doesn't work
  BEGIN
    -- Get subject title
    SELECT title INTO subject_title FROM subjects WHERE id = NEW.subject_id;
    
    log_user_id := auth.uid();
    
    IF log_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = log_user_id) THEN
      INSERT INTO activity_logs (user_id, activity_type, description, metadata)
      VALUES (
        log_user_id,
        'module_created',
        'Created module: ' || NEW.title || ' (' || COALESCE(subject_title, 'Unknown Subject') || ')',
        jsonb_build_object(
          'module_id', NEW.id,
          'module_title', NEW.title,
          'subject_id', NEW.subject_id,
          'subject_title', subject_title,
          'content_type', NEW.content_type
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore logging errors
      NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix subject creation trigger
CREATE OR REPLACE FUNCTION log_subject_creation()
RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
  log_user_id UUID;
BEGIN
  -- Try to log, but don't fail if it doesn't work
  BEGIN
    -- Get course title
    SELECT title INTO course_title FROM courses WHERE id = NEW.course_id;
    
    log_user_id := auth.uid();
    
    IF log_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = log_user_id) THEN
      INSERT INTO activity_logs (user_id, activity_type, description, metadata)
      VALUES (
        log_user_id,
        'subject_created',
        'Created subject: ' || NEW.title || ' (' || COALESCE(course_title, 'Unknown Course') || ')',
        jsonb_build_object(
          'subject_id', NEW.id,
          'subject_title', NEW.title,
          'course_id', NEW.course_id,
          'course_title', course_title,
          'instructor_id', NEW.peer_lead_id
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore logging errors
      NULL;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
