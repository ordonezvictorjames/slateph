-- =============================================
-- CREATE USER PRESENCE TRACKING
-- Tracks online/offline status of users in real-time
-- =============================================

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);

-- Disable RLS since we're using custom auth (not Supabase Auth)
ALTER TABLE user_presence DISABLE ROW LEVEL SECURITY;

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(
  p_user_id UUID,
  p_status TEXT DEFAULT 'online'
)
RETURNS JSON AS $$
BEGIN
  -- Insert or update presence
  INSERT INTO user_presence (user_id, status, last_seen, updated_at)
  VALUES (p_user_id, p_status, NOW(), NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = p_status,
    last_seen = NOW(),
    updated_at = NOW();
  
  RETURN json_build_object(
    'success', TRUE,
    'message', 'Presence updated successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark users as offline if inactive for more than 5 minutes
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE user_presence
  SET status = 'offline'
  WHERE status != 'offline'
    AND last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON user_presence TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_user_presence TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_stale_presence TO authenticated, anon;
