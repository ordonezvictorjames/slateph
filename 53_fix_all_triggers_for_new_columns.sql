-- Fix all triggers to use new column names
-- peer_lead_id -> instructor_id
-- participant_id -> trainee_id

-- 1. Fix subject creation trigger
CREATE OR REPLACE FUNCTION log_subject_creation()
RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
  log_user_id UUID;
BEGIN
  BEGIN
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
          'instructor_id', NEW.instructor_id
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix subject deletion trigger
CREATE OR REPLACE FUNCTION log_subject_deletion()
RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
  log_user_id UUID;
BEGIN
  BEGIN
    SELECT title INTO course_title FROM courses WHERE id = OLD.course_id;
    log_user_id := COALESCE(auth.uid(), OLD.instructor_id);
    
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
          'instructor_id', OLD.instructor_id
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix subject update trigger (if it exists)
CREATE OR REPLACE FUNCTION log_subject_update()
RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
  log_user_id UUID;
BEGIN
  BEGIN
    SELECT title INTO course_title FROM courses WHERE id = NEW.course_id;
    log_user_id := auth.uid();
    
    IF log_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = log_user_id) THEN
      INSERT INTO activity_logs (user_id, activity_type, description, metadata)
      VALUES (
        log_user_id,
        'subject_updated',
        'Updated subject: ' || NEW.title,
        jsonb_build_object(
          'subject_id', NEW.id,
          'subject_title', NEW.title,
          'course_id', NEW.course_id,
          'course_title', course_title,
          'instructor_id', NEW.instructor_id,
          'old_instructor_id', OLD.instructor_id
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix enrollment creation trigger
CREATE OR REPLACE FUNCTION log_enrollment_creation()
RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
  student_name TEXT;
  log_user_id UUID;
BEGIN
  BEGIN
    SELECT title INTO course_title FROM courses WHERE id = NEW.course_id;
    SELECT first_name || ' ' || last_name INTO student_name FROM profiles WHERE id = NEW.trainee_id;
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
    WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fix enrollment deletion trigger
CREATE OR REPLACE FUNCTION log_enrollment_deletion()
RETURNS TRIGGER AS $$
DECLARE
  course_title TEXT;
  student_name TEXT;
  log_user_id UUID;
BEGIN
  BEGIN
    SELECT title INTO course_title FROM courses WHERE id = OLD.course_id;
    SELECT first_name || ' ' || last_name INTO student_name FROM profiles WHERE id = OLD.trainee_id;
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
    WHEN OTHERS THEN NULL;
  END;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
