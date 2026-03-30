-- Run this in your Supabase SQL editor
-- Creates an RPC function to fetch course enrollments bypassing RLS

CREATE OR REPLACE FUNCTION public.get_course_enrollments(p_course_id uuid)
RETURNS TABLE (
  id uuid,
  enrolled_at timestamptz,
  status text,
  trainee_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, enrolled_at, status, trainee_id
  FROM course_enrollments
  WHERE course_id = p_course_id
  ORDER BY enrolled_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_enrollments TO anon, authenticated;
