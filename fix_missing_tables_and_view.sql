-- ============================================================
-- 1. CREATE course_colors table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.course_colors (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  color_name  character varying NOT NULL,
  color_hex   character varying NOT NULL,
  bg_class    character varying NOT NULL,
  text_class  character varying NOT NULL,
  border_class character varying NOT NULL,
  created_at  timestamp with time zone DEFAULT now(),
  CONSTRAINT course_colors_pkey PRIMARY KEY (id),
  CONSTRAINT course_colors_course_id_key UNIQUE (course_id)
);

-- Allow all roles to read course colors (non-sensitive display data)
ALTER TABLE public.course_colors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "course_colors_select" ON public.course_colors;
CREATE POLICY "course_colors_select" ON public.course_colors FOR SELECT USING (true);
DROP POLICY IF EXISTS "course_colors_all" ON public.course_colors;
CREATE POLICY "course_colors_all" ON public.course_colors FOR ALL USING (true);

-- ============================================================
-- 2. CREATE available_colors table (if not exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.available_colors (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  color_name  character varying NOT NULL UNIQUE,
  color_hex   character varying NOT NULL,
  bg_class    character varying NOT NULL,
  text_class  character varying NOT NULL,
  border_class character varying NOT NULL,
  is_used     boolean DEFAULT false,
  CONSTRAINT available_colors_pkey PRIMARY KEY (id)
);

ALTER TABLE public.available_colors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "available_colors_select" ON public.available_colors;
CREATE POLICY "available_colors_select" ON public.available_colors FOR SELECT USING (true);
DROP POLICY IF EXISTS "available_colors_all" ON public.available_colors;
CREATE POLICY "available_colors_all" ON public.available_colors FOR ALL USING (true);

-- Seed default colors if table is empty
INSERT INTO public.available_colors (color_name, color_hex, bg_class, text_class, border_class)
SELECT * FROM (VALUES
  ('blue',   '#3B82F6', 'bg-blue-100',   'text-blue-700',   'border-blue-300'),
  ('green',  '#22C55E', 'bg-green-100',  'text-green-700',  'border-green-300'),
  ('purple', '#A855F7', 'bg-purple-100', 'text-purple-700', 'border-purple-300'),
  ('orange', '#F97316', 'bg-orange-100', 'text-orange-700', 'border-orange-300'),
  ('red',    '#EF4444', 'bg-red-100',    'text-red-700',    'border-red-300'),
  ('yellow', '#EAB308', 'bg-yellow-100', 'text-yellow-700', 'border-yellow-300'),
  ('teal',   '#14B8A6', 'bg-teal-100',   'text-teal-700',   'border-teal-300'),
  ('pink',   '#EC4899', 'bg-pink-100',   'text-pink-700',   'border-pink-300'),
  ('indigo', '#6366F1', 'bg-indigo-100', 'text-indigo-700', 'border-indigo-300'),
  ('gray',   '#6B7280', 'bg-gray-100',   'text-gray-700',   'border-gray-300')
) AS v(color_name, color_hex, bg_class, text_class, border_class)
WHERE NOT EXISTS (SELECT 1 FROM public.available_colors LIMIT 1);

-- ============================================================
-- 3. RECREATE activity_logs_with_users view with correct column names
-- ============================================================
DROP VIEW IF EXISTS public.activity_logs_with_users;

CREATE VIEW public.activity_logs_with_users AS
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

-- Grant access to the view
GRANT SELECT ON public.activity_logs_with_users TO anon, authenticated;
