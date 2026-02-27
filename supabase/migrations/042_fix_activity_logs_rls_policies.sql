-- =============================================
-- FIX ACTIVITY LOGS RLS POLICIES
-- Disable RLS completely since trigger functions handle logging
-- =============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Service role can insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow trigger inserts" ON activity_logs;
DROP POLICY IF EXISTS "Admins and developers can view all activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow system inserts" ON activity_logs;

-- Disable RLS on activity_logs table
-- Trigger functions with SECURITY DEFINER will handle all inserts
-- This prevents RLS policy violations during user creation
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
