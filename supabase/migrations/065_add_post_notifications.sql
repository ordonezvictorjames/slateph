-- =============================================
-- ADD POST NOTIFICATIONS
-- Notify post authors when users react or comment
-- =============================================

-- Update notification type constraint to include post interactions
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'course_enrollment',
    'course_assignment',
    'course_update',
    'assignment_graded',
    'new_announcement',
    'system_alert',
    'post_reaction',
    'post_comment'
  ));

-- Trigger function to notify post author on new reaction
CREATE OR REPLACE FUNCTION notify_post_reaction()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_reactor_name TEXT;
  v_post_content TEXT;
BEGIN
  -- Get post author ID and content
  SELECT user_id, content INTO v_post_author_id, v_post_content
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user reacts to their own post
  IF v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get reactor's name
  SELECT first_name || ' ' || last_name INTO v_reactor_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Create notification for post author
  PERFORM create_notification(
    v_post_author_id,
    'post_reaction',
    'New Reaction on Your Post',
    v_reactor_name || ' reacted to your post',
    '/profile',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'reactor_id', NEW.user_id,
      'reactor_name', v_reactor_name,
      'reaction_type', NEW.reaction_type,
      'post_preview', LEFT(v_post_content, 50)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to notify post author on new comment
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_post_author_id UUID;
  v_commenter_name TEXT;
  v_post_content TEXT;
BEGIN
  -- Get post author ID and content
  SELECT user_id, content INTO v_post_author_id, v_post_content
  FROM posts
  WHERE id = NEW.post_id;
  
  -- Don't notify if user comments on their own post
  IF v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get commenter's name
  SELECT first_name || ' ' || last_name INTO v_commenter_name
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Create notification for post author
  PERFORM create_notification(
    v_post_author_id,
    'post_comment',
    'New Comment on Your Post',
    v_commenter_name || ' commented on your post',
    '/profile',
    jsonb_build_object(
      'post_id', NEW.post_id,
      'commenter_id', NEW.user_id,
      'commenter_name', v_commenter_name,
      'comment_content', LEFT(NEW.content, 100),
      'post_preview', LEFT(v_post_content, 50)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_post_reaction ON post_reactions;
CREATE TRIGGER trigger_notify_post_reaction
  AFTER INSERT ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_reaction();

DROP TRIGGER IF EXISTS trigger_notify_post_comment ON post_comments;
CREATE TRIGGER trigger_notify_post_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_comment();

-- Add comments for documentation
COMMENT ON FUNCTION notify_post_reaction() IS 'Sends notification to post author when someone reacts to their post';
COMMENT ON FUNCTION notify_post_comment() IS 'Sends notification to post author when someone comments on their post';
