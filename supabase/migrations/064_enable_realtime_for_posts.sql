-- =============================================
-- ENABLE REALTIME FOR POSTS SYSTEM
-- Enable real-time updates for posts, reactions, and comments
-- =============================================

-- Enable realtime for posts table
ALTER PUBLICATION supabase_realtime ADD TABLE posts;

-- Enable realtime for post_reactions table
ALTER PUBLICATION supabase_realtime ADD TABLE post_reactions;

-- Enable realtime for post_comments table
ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;

-- Add comments for documentation
COMMENT ON TABLE posts IS 'User posts with content, emotions, and images (realtime enabled)';
COMMENT ON TABLE post_reactions IS 'Reactions to posts (like, love, etc.) (realtime enabled)';
COMMENT ON TABLE post_comments IS 'Comments on posts (realtime enabled)';
