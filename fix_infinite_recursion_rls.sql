-- Fix: Infinite recursion in RLS policies
-- Run this in your Supabase SQL editor

-- Step 1: Check what policies exist on course_enrollments and profiles
SELECT tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('course_enrollments', 'profiles')
ORDER BY tablename, policyname;

-- Step 2: Drop the problematic recursive policies on profiles
-- (These policies check profiles.role by querying profiles again, causing recursion)
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;

-- Step 3: Drop problematic policies on course_enrollments that join profiles
DROP POLICY IF EXISTS "course_enrollments_select_policy" ON course_enrollments;
DROP POLICY IF EXISTS "Enable read access for enrollments" ON course_enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON course_enrollments;

-- Step 4: Create simple non-recursive policies

-- Profiles: allow all reads (app controls access via session)
CREATE POLICY "profiles_allow_all_reads"
ON profiles FOR SELECT
USING (true);

-- Course enrollments: allow all reads
CREATE POLICY "enrollments_allow_all_reads"
ON course_enrollments FOR SELECT
USING (true);

-- Course enrollments: allow insert/update/delete (admin controlled at app level)
CREATE POLICY "enrollments_allow_all_writes"
ON course_enrollments FOR ALL
USING (true)
WITH CHECK (true);

-- Step 5: Verify no more recursion by checking policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('course_enrollments', 'profiles')
ORDER BY tablename;
