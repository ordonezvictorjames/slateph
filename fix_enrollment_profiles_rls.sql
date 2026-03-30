-- Fix: Allow admins and developers to read all profiles for enrollment
-- Run this in your Supabase SQL editor

-- Check existing policies on profiles
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Add a policy that allows admins/developers to read all profiles
-- (only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Admins can read all profiles'
  ) THEN
    CREATE POLICY "Admins can read all profiles"
    ON profiles FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'developer')
      )
    );
  END IF;
END $$;

-- Alternative: if using custom auth (not Supabase auth), 
-- you may need a more permissive policy:
-- DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
-- CREATE POLICY "Admins can read all profiles"
-- ON profiles FOR SELECT
-- USING (true);  -- allow all reads, control at app level
