-- Comprehensive fix: Drop and recreate all subject-related triggers with correct column names

-- Step 1: Drop all existing triggers on subjects table
DROP TRIGGER IF EXISTS log_subject_creation_trigger ON subjects;
DROP TRIGGER IF EXISTS log_subject_update_trigger ON subjects;
DROP TRIGGER IF EXISTS log_subject_deletion_trigger ON subjects;
DROP TRIGGER IF EXISTS subjects_updated_at ON subjects;

-- Step 2: Drop the old functions
DROP FUNCTION IF EXISTS log_subject_creation() CASCADE;
DROP FUNCTION IF EXISTS log_subject_update() CASCADE;
DROP FUNCTION IF EXISTS log_subject_deletion() CASCADE;

-- Step 3: Create new functions with correct column name (instructor_id)
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

-- Step 4: Recreate triggers
CREATE TRIGGER log_subject_creation_trigger
  AFTER INSERT ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION log_subject_creation();

CREATE TRIGGER log_subject_update_trigger
  AFTER UPDATE ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION log_subject_update();

CREATE TRIGGER log_subject_deletion_trigger
  BEFORE DELETE ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION log_subject_deletion();

-- Step 5: Recreate updated_at trigger if it exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify the fix
SELECT 'Triggers recreated successfully!' as status;
