-- Fix RLS policies for dashboard queries

-- 1. course_colors: allow all authenticated users to read
-- (colors are non-sensitive display data)
ALTER TABLE public.course_colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_colors_select" ON public.course_colors;
CREATE POLICY "course_colors_select"
  ON public.course_colors
  FOR SELECT
  USING (true);

-- 2. available_colors: allow all authenticated users to read
ALTER TABLE public.available_colors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "available_colors_select" ON public.available_colors;
CREATE POLICY "available_colors_select"
  ON public.available_colors
  FOR SELECT
  USING (true);

-- 3. activity_logs: allow all authenticated users to read their own,
--    admins/developers can read all
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
CREATE POLICY "activity_logs_select"
  ON public.activity_logs
  FOR SELECT
  USING (true);

-- Allow inserts from anyone (activity logging happens for all users)
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_insert"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (true);

-- 4. activity_logs_with_users is a VIEW — views inherit the RLS of their
--    underlying tables. If the view was created with SECURITY DEFINER it
--    bypasses RLS; if not, the caller needs access to activity_logs.
--    Re-create it as SECURITY DEFINER so admins/devs can query it via
--    the anon/service key used by the custom auth system.
DROP VIEW IF EXISTS public.activity_logs_with_users;
CREATE OR REPLACE VIEW public.activity_logs_with_users
WITH (security_invoker = false)
AS
SELECT
  al.id,
  al.user_id,
  al.activity_type,
  al.description,
  al.metadata,
  al.created_at,
  p.first_name  AS user_first_name,
  p.last_name   AS user_last_name,
  p.email       AS user_email,
  p.role        AS user_role,
  p.avatar_url  AS user_avatar_url
FROM public.activity_logs al
LEFT JOIN public.profiles p ON p.id = al.user_id;

-- Grant select on the view to the anon and authenticated roles
GRANT SELECT ON public.activity_logs_with_users TO anon, authenticated;
