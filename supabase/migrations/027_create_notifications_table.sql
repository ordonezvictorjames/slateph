-- =============================================
-- CREATE NOTIFICATIONS TABLE
-- Real-time notifications for users
-- =============================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'course_enrollment',
    'course_assignment',
    'course_update',
    'assignment_graded',
    'new_announcement',
    'system_alert'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- Enable RLS (but we'll disable it for custom auth)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Disable RLS for custom authentication (not using Supabase Auth)
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Note: Security is handled at the application level with custom authentication
-- RLS policies below are kept for reference but are not active

-- RLS Policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to notify on course enrollment
CREATE OR REPLACE FUNCTION notify_course_enrollment()
RETURNS TRIGGER AS $$
DECLARE
  v_course_title TEXT;
BEGIN
  -- Get course title
  SELECT title INTO v_course_title
  FROM courses
  WHERE id = NEW.course_id;
  
  -- Create notification for student
  PERFORM create_notification(
    NEW.student_id,
    'course_enrollment',
    'Enrolled in Course',
    'You have been enrolled in ' || v_course_title,
    '/student/my-courses',
    jsonb_build_object('course_id', NEW.course_id, 'course_title', v_course_title)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to notify instructor on subject assignment
CREATE OR REPLACE FUNCTION notify_instructor_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if instructor_id is being set or changed
  IF (TG_OP = 'INSERT' AND NEW.instructor_id IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.instructor_id IS DISTINCT FROM OLD.instructor_id AND NEW.instructor_id IS NOT NULL) THEN
    
    -- Get course title for the subject
    DECLARE
      v_course_title TEXT;
    BEGIN
      SELECT title INTO v_course_title
      FROM courses
      WHERE id = NEW.course_id;
      
      PERFORM create_notification(
        NEW.instructor_id,
        'course_assignment',
        'Assigned to Subject',
        'You have been assigned to teach ' || NEW.title || ' in ' || COALESCE(v_course_title, 'a course'),
        '/instructor/courses',
        jsonb_build_object('subject_id', NEW.id, 'subject_title', NEW.title, 'course_title', v_course_title)
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_course_enrollment ON course_enrollments;
CREATE TRIGGER trigger_notify_course_enrollment
  AFTER INSERT ON course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION notify_course_enrollment();

DROP TRIGGER IF EXISTS trigger_notify_instructor_assignment ON subjects;
CREATE TRIGGER trigger_notify_instructor_assignment
  AFTER INSERT OR UPDATE OF instructor_id ON subjects
  FOR EACH ROW
  EXECUTE FUNCTION notify_instructor_assignment();

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = p_notification_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
