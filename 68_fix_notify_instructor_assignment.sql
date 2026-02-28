-- Fix the notify_peer_lead_assignment trigger to use instructor_id

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS notify_peer_lead_assignment ON subjects;
DROP FUNCTION IF EXISTS notify_peer_lead_assignment() CASCADE;

-- Create new function with correct column name
CREATE OR REPLACE FUNCTION notify_instructor_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify if instructor_id is being set or changed
  IF (TG_OP = 'INSERT' AND NEW.instructor_id IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.instructor_id IS DISTINCT FROM OLD.instructor_id AND NEW.instructor_id IS NOT NULL) THEN
    -- Get course title for the subject
    DECLARE
      course_title TEXT;
    BEGIN
      SELECT title INTO course_title FROM courses WHERE id = NEW.course_id;
      
      PERFORM create_notification(
        NEW.instructor_id,
        'course_assignment',
        'Assigned to Subject',
        format('You have been assigned to teach %s in %s', NEW.title, course_title),
        '/instructor/courses',
        jsonb_build_object('subject_id', NEW.id, 'course_id', NEW.course_id)
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create new trigger
CREATE TRIGGER notify_instructor_assignment
  AFTER INSERT OR UPDATE ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION notify_instructor_assignment();

-- Verify the fix
SELECT 'Instructor assignment notification trigger fixed!' as status;
