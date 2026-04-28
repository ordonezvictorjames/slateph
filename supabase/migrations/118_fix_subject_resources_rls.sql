-- subject_resources has RLS enabled but no read policy, blocking all users from seeing library items
-- Fix: disable RLS (app-layer security) so all authenticated users can read resources

ALTER TABLE subject_resources DISABLE ROW LEVEL SECURITY;

-- Grant read access to anon and authenticated
GRANT SELECT ON subject_resources TO anon;
GRANT SELECT ON subject_resources TO authenticated;
GRANT INSERT, UPDATE, DELETE ON subject_resources TO authenticated;
