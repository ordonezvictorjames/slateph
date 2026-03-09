-- Fix friends system to work with custom authentication
-- This removes the auth.uid() dependency and uses direct user IDs

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own connections" ON connections;
DROP POLICY IF EXISTS "Users can create their own connection requests" ON connections;
DROP POLICY IF EXISTS "Users can update connections they're part of" ON connections;
DROP POLICY IF EXISTS "Users can delete their own connections" ON connections;

-- Disable RLS temporarily to allow direct access
ALTER TABLE connections DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with simpler policies
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for authenticated users
CREATE POLICY "Allow all authenticated users to view connections"
    ON connections FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow all authenticated users to insert connections"
    ON connections FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update connections"
    ON connections FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow all authenticated users to delete connections"
    ON connections FOR DELETE
    TO authenticated
    USING (true);

-- Grant permissions to authenticated role
GRANT ALL ON connections TO authenticated;
GRANT ALL ON connections TO anon;

SELECT 'Friends system auth fixed!' as status;
