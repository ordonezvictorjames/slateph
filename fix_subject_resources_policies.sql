-- Fix subject_resources RLS policies
-- Run this in Supabase SQL Editor if you're getting RLS policy errors

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to view resources" ON subject_resources;
DROP POLICY IF EXISTS "Allow admins and developers to insert resources" ON subject_resources;
DROP POLICY IF EXISTS "Allow admins and developers to update resources" ON subject_resources;
DROP POLICY IF EXISTS "Allow admins and developers to delete resources" ON subject_resources;

-- Enable RLS
ALTER TABLE subject_resources ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view active resources
CREATE POLICY "Allow authenticated users to view resources"
  ON subject_resources
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow admins and developers to insert resources
CREATE POLICY "Allow admins and developers to insert resources"
  ON subject_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Policy: Allow admins and developers to update resources
CREATE POLICY "Allow admins and developers to update resources"
  ON subject_resources
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Policy: Allow admins and developers to delete resources
CREATE POLICY "Allow admins and developers to delete resources"
  ON subject_resources
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Verify your user role
SELECT id, email, role FROM profiles WHERE id = auth.uid();
