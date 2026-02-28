-- Fix all subject-related triggers to use instructor_id instead of peer_lead_id
-- This fixes the error: record "new" has no field "peer_lead_id"

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

-- 3. Fix subject update trigger
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

-- 4. Fix module creation trigger (if it references peer_lead_id)
CREATE OR REPLACE FUNCTION log_module_creation()
RETURNS TRIGGER AS $$
DECLARE
  subject_title TEXT;
  course_title TEXT;
  course_id_var UUID;
  log_user_id UUID;
BEGIN
  BEGIN
    SELECT title, course_id INTO subject_title, course_id_var 
    FROM subjects WHERE id = NEW.subject_id;
    
    SELECT title INTO course_title FROM courses WHERE id = course_id_var;
    
    log_user_id := auth.uid();
    
    IF log_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE id = log_user_id) THEN
      INSERT INTO activity_logs (user_id, activity_type, description, metadata)
      VALUES (
        log_user_id,
        'module_created',
        'Created module: ' || NEW.title || ' in ' || COALESCE(subject_title, 'Unknown Subject'),
        jsonb_build_object(
          'module_id', NEW.id,
          'module_title', NEW.title,
          'subject_id', NEW.subject_id,
          'subject_title', subject_title,
          'course_id', course_id_var,
          'course_title', course_title
        )
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the changes
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN ('log_subject_creation', 'log_subject_deletion', 'log_subject_update', 'log_module_creation')
  AND pg_get_functiondef(oid) LIKE '%instructor_id%';
