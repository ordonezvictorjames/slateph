-- Restrict instructor permissions on courses, modules, and subjects tables
-- Note: Using custom authentication, so RLS is disabled
-- Permissions must be enforced at the application level

-- ============================================================================
-- 1. Drop existing policies if they exist
-- ============================================================================

-- Drop existing courses policies
DROP POLICY IF EXISTS "Anyone can read courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can read courses" ON public.courses;
DROP POLICY IF EXISTS "Only admins and developers can read courses" ON public.courses;
DROP POLICY IF EXISTS "Only admins and developers can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Only admins and developers can update courses" ON public.courses;
DROP POLICY IF EXISTS "Only admins and developers can delete courses" ON public.courses;

-- Drop existing modules policies
DROP POLICY IF EXISTS "Anyone can read modules" ON public.modules;
DROP POLICY IF EXISTS "Authenticated users can read modules" ON public.modules;
DROP POLICY IF EXISTS "Only admins and developers can read modules" ON public.modules;
DROP POLICY IF EXISTS "Only admins and developers can insert modules" ON public.modules;
DROP POLICY IF EXISTS "Only admins and developers can update modules" ON public.modules;
DROP POLICY IF EXISTS "Only admins and developers can delete modules" ON public.modules;

-- Drop existing subjects policies
DROP POLICY IF EXISTS "Anyone can read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Authenticated users can read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Only admins and developers can read subjects" ON public.subjects;
DROP POLICY IF EXISTS "Only admins and developers can insert subjects" ON public.subjects;
DROP POLICY IF EXISTS "Only admins and developers can update subjects" ON public.subjects;
DROP POLICY IF EXISTS "Only admins and developers can delete subjects" ON public.subjects;

-- ============================================================================
-- 2. Disable Row Level Security (using custom authentication)
-- ============================================================================

-- Since we're using custom authentication (not Supabase Auth),
-- we need to disable RLS and handle permissions at the application level
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Application-level permission enforcement
-- ============================================================================

-- Permissions will be enforced in the application code:
-- - All users can READ courses, modules, and subjects
-- - Only admins and developers can CREATE, UPDATE, DELETE
-- - Instructors and students have read-only access
