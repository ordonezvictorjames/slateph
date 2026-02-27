-- =============================================
-- FIX ACTIVITY LOGS RLS POLICY
-- Allow triggers to insert activity logs
-- =============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow system to insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow triggers to insert activity logs" ON activity_logs;

-- Create policy to allow inserts from triggers and authenticated users
CREATE POLICY "Allow activity log inserts"
ON activity_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- Create policy to allow reading activity logs (for admins and developers)
DROP POLICY IF EXISTS "Allow reading activity logs" ON activity_logs;
CREATE POLICY "Allow reading activity logs"
ON activity_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'developer')
  )
  OR user_id = auth.uid()
);

-- Grant necessary permissions
GRANT INSERT ON activity_logs TO authenticated, anon;
GRANT SELECT ON activity_logs TO authenticated;
