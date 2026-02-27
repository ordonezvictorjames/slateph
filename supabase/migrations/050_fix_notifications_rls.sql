-- =============================================
-- FIX NOTIFICATIONS RLS
-- Ensure RLS is properly disabled for notifications table
-- =============================================

-- Disable RLS on notifications table
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Grant necessary permissions
GRANT ALL ON notifications TO postgres;
GRANT ALL ON notifications TO anon;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;

-- Ensure the table is accessible
ALTER TABLE notifications OWNER TO postgres;

-- Verify RLS is disabled
DO $$
BEGIN
  IF (SELECT relrowsecurity FROM pg_class WHERE relname = 'notifications') THEN
    RAISE NOTICE 'WARNING: RLS is still enabled on notifications table';
  ELSE
    RAISE NOTICE 'SUCCESS: RLS is disabled on notifications table';
  END IF;
END $$;
