-- Fix enrollment creation trigger to use trainee_id instead of participant_id
CREATE OR REPLACE FUNCTION log_enrollment_creation()
RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
  student_name TEXT;
  log_user_id UUID;
BEGIN
  -- Try to log, but don't fail if it doesn't work
  BEGIN
    -- Get course title
    SELECT title INTO course_title FROM courses WHERE id = NEW.course_id;
    
    -- Get student name
    SELECT first_name || ' ' || last_name INTO student_name 
    FROM profiles WHERE id = NEW.trainee_id;
    
    log_user_id := COALESCE(auth.uid(), NEW.trainee_id);
    
    IF log_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = log_user_id) THEN
      INSERT INTO activity_logs (user_id, activity_type, description, metadata)
      VALUES (
        log_user_id,
        'enrollment_created',
        'Enrolled ' || COALESCE(student_name, 'student') || ' in ' || COALESCE(course_title, 'course'),
        jsonb_build_object(
          'enrollment_id', NEW.id,
          'course_id', NEW.course_id,
          'course_title', course_title,
          'trainee_id', NEW.trainee_id,
          'student_name', student_name
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

-- Fix enrollment deletion trigger to use trainee_id instead of participant_id
CREATE OR REPLACE FUNCTION log_enrollment_deletion()
RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
  student_name TEXT;
  log_user_id UUID;
BEGIN
  -- Try to log, but don't fail if it doesn't work
  BEGIN
    -- Get course title
    SELECT title INTO course_title FROM courses WHERE id = OLD.course_id;
    
    -- Get student name
    SELECT first_name || ' ' || last_name INTO student_name 
    FROM profiles WHERE id = OLD.trainee_id;
    
    log_user_id := COALESCE(auth.uid(), OLD.trainee_id);
    
    IF log_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = log_user_id) THEN
      INSERT INTO activity_logs (user_id, activity_type, description, metadata)
      VALUES (
        log_user_id,
        'enrollment_deleted',
        'Unenrolled ' || COALESCE(student_name, 'student') || ' from ' || COALESCE(course_title, 'course'),
        jsonb_build_object(
          'enrollment_id', OLD.id,
          'course_id', OLD.course_id,
          'course_title', course_title,
          'trainee_id', OLD.trainee_id,
          'student_name', student_name
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
