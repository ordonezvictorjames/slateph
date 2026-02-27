-- =============================================
-- CREATE FEATURE REQUESTS TABLE
-- Allow users to submit feature requests and suggestions
-- =============================================

-- Create feature requests table
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN (
    'feature',
    'bug'
  )),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'ongoing',
    'finished'
  )),
  votes INTEGER DEFAULT 0,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create votes table to track who voted for what
CREATE TABLE IF NOT EXISTS feature_request_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_request_id UUID REFERENCES feature_requests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feature_request_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON feature_requests(category);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON feature_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_feature_id ON feature_request_votes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_user_id ON feature_request_votes(user_id);

-- Enable RLS (but we'll disable it for custom auth)
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;

-- Disable RLS for custom authentication (not using Supabase Auth)
ALTER TABLE feature_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes DISABLE ROW LEVEL SECURITY;

-- Note: Security is handled at the application level with custom authentication
-- RLS policies below are kept for reference but are not active

-- RLS Policies for feature_requests
CREATE POLICY "Anyone can view feature requests" ON feature_requests
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create their own feature requests" ON feature_requests
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own feature requests" ON feature_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id::text = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = auth.uid() OR user_id::text = current_setting('app.current_user_id', true));

CREATE POLICY "Admins can update any feature request" ON feature_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id::text = current_setting('app.current_user_id', true)
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can delete their own feature requests" ON feature_requests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR user_id::text = current_setting('app.current_user_id', true));

-- RLS Policies for feature_request_votes
CREATE POLICY "Anyone can view votes" ON feature_request_votes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can vote on feature requests" ON feature_request_votes
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can remove their own votes" ON feature_request_votes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR user_id::text = current_setting('app.current_user_id', true));

-- Function to update vote count
CREATE OR REPLACE FUNCTION update_feature_request_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feature_requests
    SET votes = votes + 1
    WHERE id = NEW.feature_request_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feature_requests
    SET votes = votes - 1
    WHERE id = OLD.feature_request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update vote count
DROP TRIGGER IF EXISTS trigger_update_feature_request_votes ON feature_request_votes;
CREATE TRIGGER trigger_update_feature_request_votes
  AFTER INSERT OR DELETE ON feature_request_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_request_votes();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
DROP TRIGGER IF EXISTS trigger_update_feature_request_timestamp ON feature_requests;
CREATE TRIGGER trigger_update_feature_request_timestamp
  BEFORE UPDATE ON feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_request_timestamp();

-- Create notification when feature request status changes
CREATE OR REPLACE FUNCTION notify_feature_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if status changed and it's not pending anymore
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status != 'pending' THEN
    PERFORM create_notification(
      NEW.user_id,
      'system_alert',
      'Feature Request Update',
      'Your feature request "' || NEW.title || '" status changed to: ' || REPLACE(NEW.status, '_', ' '),
      '/feature-requests',
      jsonb_build_object('feature_request_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for status change notification
DROP TRIGGER IF EXISTS trigger_notify_feature_request_status_change ON feature_requests;
CREATE TRIGGER trigger_notify_feature_request_status_change
  AFTER UPDATE OF status ON feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_feature_request_status_change();
