-- Allow all authenticated users to read active courses
-- Run this in Supabase SQL Editor

-- Option 1: If RLS is enabled on courses table, add a read policy
CREATE POLICY "Allow authenticated users to read active courses"
ON public.courses
FOR SELECT
TO authenticated
USING (status = 'active');

-- Option 2: If you want to disable RLS entirely on courses (simpler)
-- ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;

-- Also grant to anon just in case
GRANT SELECT ON public.courses TO anon;
GRANT SELECT ON public.courses TO authenticated;
