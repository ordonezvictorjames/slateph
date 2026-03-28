-- ============================================================
-- SLATE - Complete Schema for fresh Supabase project
-- Run this entire file in the SQL Editor
-- ============================================================

-- ── ENUMS ────────────────────────────────────────────────────
CREATE TYPE public.user_role AS ENUM (
  'admin', 'developer', 'instructor', 'guest',
  'shs_student', 'jhs_student', 'college_student', 'scholar'
);

CREATE TYPE public.account_tier AS ENUM (
  'visitor', 'beginner', 'intermediate', 'expert', 'vip'
);

CREATE TYPE public.enrollment_status AS ENUM ('active', 'completed', 'dropped');
CREATE TYPE public.enrollment_type   AS ENUM ('trainee', 'tesda_scholar', 'both');
CREATE TYPE public.submission_status AS ENUM ('draft', 'submitted', 'graded');
CREATE TYPE public.attempt_status    AS ENUM ('in_progress', 'completed', 'abandoned');
CREATE TYPE public.assignment_type   AS ENUM ('essay', 'quiz', 'project', 'file_upload');
CREATE TYPE public.question_type     AS ENUM ('multiple_choice', 'true_false', 'short_answer', 'essay');

-- ── PROFILES ─────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                   uuid NOT NULL DEFAULT uuid_generate_v4(),
  first_name           character varying NOT NULL,
  last_name            character varying NOT NULL,
  email                character varying NOT NULL UNIQUE,
  password             text,
  role                 public.user_role NOT NULL DEFAULT 'guest',
  status               text DEFAULT 'active' CHECK (status = ANY (ARRAY['active','inactive','pending'])),
  avatar_url           text,
  banner_url           text,
  strand               character varying,
  section              text,
  cluster              character varying,
  grade                integer CHECK (grade IS NULL OR (grade >= 1 AND grade <= 12)),
  batch_number         integer,
  account_tier         public.account_tier DEFAULT 'visitor',
  account_expires_at   timestamp with time zone,
  account_duration_days integer,
  last_login_at        timestamp with time zone DEFAULT now(),
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- ── COURSES ──────────────────────────────────────────────────
CREATE TABLE public.courses (
  id                    uuid NOT NULL DEFAULT uuid_generate_v4(),
  title                 character varying NOT NULL,
  code                  character varying UNIQUE,
  status                text DEFAULT 'draft' CHECK (status = ANY (ARRAY['active','inactive','draft'])),
  course_type           text DEFAULT 'academic' CHECK (course_type = ANY (ARRAY['academic','tesda','upskill'])),
  enrollment_type       public.enrollment_type DEFAULT 'both',
  semester              character varying,
  year                  integer,
  max_enrollment        integer,
  auto_enroll           boolean DEFAULT true,
  require_approval      boolean DEFAULT false,
  allow_waitlist        boolean DEFAULT true,
  enrollment_start_date timestamp with time zone,
  enrollment_end_date   timestamp with time zone,
  thumbnail_url         text,
  created_at            timestamp with time zone DEFAULT now(),
  updated_at            timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id)
);

-- ── SUBJECTS ─────────────────────────────────────────────────
CREATE TABLE public.subjects (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  instructor_id   uuid REFERENCES public.profiles(id),
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  order_index     integer NOT NULL DEFAULT 1,
  status          text NOT NULL DEFAULT 'draft' CHECK (status = ANY (ARRAY['active','inactive','draft'])),
  enrollment_type text NOT NULL DEFAULT 'student' CHECK (enrollment_type = ANY (ARRAY['trainee','tesda_scholar','both'])),
  is_locked       boolean DEFAULT false,
  online_class_link text,
  thumbnail_url   text,
  created_at      timestamp with time zone DEFAULT now(),
  updated_at      timestamp with time zone DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (id)
);

-- ── MODULES ──────────────────────────────────────────────────
CREATE TABLE public.modules (
  id               uuid NOT NULL DEFAULT uuid_generate_v4(),
  subject_id       uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title            character varying NOT NULL,
  description      text NOT NULL DEFAULT '',
  content_type     text DEFAULT 'text' CHECK (content_type = ANY (ARRAY['video','text','online_conference','online_document','pdf_document','canva_presentation','slide_presentation'])),
  content_text     text,
  content_url      text,
  text_content     text,
  video_url        text,
  document_url     text,
  canva_url        text,
  conference_url   text,
  thumbnail_url    text,
  order_index      integer NOT NULL DEFAULT 1,
  status           text DEFAULT 'draft' CHECK (status = ANY (ARRAY['active','inactive','draft'])),
  duration_minutes integer DEFAULT 0,
  created_at       timestamp with time zone DEFAULT now(),
  updated_at       timestamp with time zone DEFAULT now(),
  CONSTRAINT modules_pkey PRIMARY KEY (id)
);

-- ── COURSE ENROLLMENTS ───────────────────────────────────────
CREATE TABLE public.course_enrollments (
  id          uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  trainee_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at timestamp with time zone DEFAULT now(),
  status      public.enrollment_status DEFAULT 'active',
  CONSTRAINT course_enrollments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.enrollments (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at timestamp with time zone DEFAULT now(),
  status      text DEFAULT 'active' CHECK (status = ANY (ARRAY['active','completed','dropped'])),
  grade       numeric,
  CONSTRAINT enrollments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.subject_enrollments (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  subject_id     uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enrolled_at    timestamp with time zone DEFAULT now(),
  status         text DEFAULT 'active' CHECK (status = ANY (ARRAY['active','inactive','completed','dropped'])),
  progress       numeric DEFAULT 0.00 CHECK (progress >= 0 AND progress <= 100),
  created_at     timestamp with time zone DEFAULT now(),
  updated_at     timestamp with time zone DEFAULT now(),
  CONSTRAINT subject_enrollments_pkey PRIMARY KEY (id)
);

-- ── COURSE SCHEDULES ─────────────────────────────────────────
CREATE TABLE public.course_schedules (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_by      uuid REFERENCES public.profiles(id),
  title           character varying NOT NULL,
  description     text,
  batch_number    integer,
  start_date      timestamp without time zone NOT NULL,
  end_date        timestamp without time zone NOT NULL,
  enrollment_type character varying DEFAULT 'both',
  sections        text[],
  grade_levels    integer[],
  strands         text[],
  batch_numbers   integer[],
  status          character varying DEFAULT 'scheduled' CHECK (status = ANY (ARRAY['scheduled','active','completed','cancelled'])),
  grade           text,
  section         text,
  cluster         text,
  strand          text,
  batch           text,
  created_at      timestamp with time zone DEFAULT now(),
  updated_at      timestamp with time zone DEFAULT now(),
  CONSTRAINT course_schedules_pkey PRIMARY KEY (id)
);

CREATE TABLE public.schedule_enrollments (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.course_schedules(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'student' CHECK (role = ANY (ARRAY['student','instructor'])),
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT schedule_enrollments_pkey PRIMARY KEY (id)
);

-- ── ACTIVITY LOGS ────────────────────────────────────────────
CREATE TABLE public.activity_logs (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES public.profiles(id),
  activity_type character varying NOT NULL CHECK (activity_type = ANY (ARRAY[
    'login','logout','user_created','user_updated','user_deleted',
    'course_created','course_updated','course_deleted',
    'subject_created','subject_updated','subject_deleted',
    'module_created','module_updated','module_deleted',
    'enrollment_created','enrollment_updated','enrollment_deleted',
    'assignment_created','assignment_updated','assignment_deleted',
    'submission_created','submission_updated','submission_deleted',
    'grade_created','grade_updated','grade_deleted',
    'schedule_created','schedule_updated','schedule_deleted'
  ])),
  description   text NOT NULL,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_activity_logs_user_id    ON public.activity_logs (user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs (created_at DESC);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE public.notifications (
  id               uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type             character varying NOT NULL CHECK (type = ANY (ARRAY[
    'course_enrollment','course_assignment','course_update',
    'assignment_graded','new_announcement','system_alert',
    'post_reaction','post_comment'
  ])),
  title            text NOT NULL,
  message          text NOT NULL,
  link             text,
  is_read          boolean DEFAULT false,
  metadata         jsonb DEFAULT '{}',
  created_at       timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- ── CHAT ─────────────────────────────────────────────────────
CREATE TABLE public.lounge_chat_messages (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message    text NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 2000),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lounge_chat_messages_pkey PRIMARY KEY (id)
);

CREATE TABLE public.course_chat_messages (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message    text NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 2000),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_chat_messages_pkey PRIMARY KEY (id)
);

-- ── CONNECTIONS (FRIENDS) ────────────────────────────────────
CREATE TABLE public.connections (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status = ANY (ARRAY['pending','accepted','rejected','blocked'])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT connections_pkey PRIMARY KEY (id)
);

-- ── USER PRESENCE ────────────────────────────────────────────
CREATE TABLE public.user_presence (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     text NOT NULL DEFAULT 'offline' CHECK (status = ANY (ARRAY['online','away','offline'])),
  last_seen  timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_presence_pkey PRIMARY KEY (user_id)
);

-- ── USER SESSIONS ────────────────────────────────────────────
CREATE TABLE public.user_sessions (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ip_address  text,
  device_type text,
  browser     text,
  os          text,
  device_name text,
  user_agent  text,
  last_active timestamp with time zone DEFAULT now(),
  created_at  timestamp with time zone DEFAULT now(),
  is_active   boolean DEFAULT true,
  CONSTRAINT user_sessions_pkey PRIMARY KEY (id)
);

-- ── POSTS ────────────────────────────────────────────────────
CREATE TABLE public.posts (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text NOT NULL,
  emotion    text CHECK (emotion = ANY (ARRAY['happy','sad','excited','loved','angry','thoughtful','celebrating'])),
  image_url  text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id)
);

CREATE TABLE public.post_reactions (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id       uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type text NOT NULL CHECK (reaction_type = ANY (ARRAY['like','love','haha','wow','sad','angry'])),
  created_at    timestamp with time zone DEFAULT now(),
  CONSTRAINT post_reactions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.post_comments (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_comments_pkey PRIMARY KEY (id)
);

-- ── ASSIGNMENTS ──────────────────────────────────────────────
CREATE TABLE public.assignments (
  id                   uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id            uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title                character varying NOT NULL,
  description          text NOT NULL DEFAULT '',
  assignment_type      public.assignment_type NOT NULL,
  due_date             timestamp with time zone NOT NULL,
  max_points           integer NOT NULL DEFAULT 100,
  allow_late_submission boolean DEFAULT true,
  late_penalty_percent integer DEFAULT 10 CHECK (late_penalty_percent >= 0 AND late_penalty_percent <= 100),
  instructions         text NOT NULL DEFAULT '',
  created_at           timestamp with time zone DEFAULT now(),
  updated_at           timestamp with time zone DEFAULT now(),
  CONSTRAINT assignments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.assignment_submissions (
  id              uuid NOT NULL DEFAULT uuid_generate_v4(),
  assignment_id   uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submission_text text,
  file_urls       text[] DEFAULT '{}',
  submitted_at    timestamp with time zone DEFAULT now(),
  is_late         boolean DEFAULT false,
  status          public.submission_status DEFAULT 'draft',
  grade           integer,
  feedback        text,
  graded_at       timestamp with time zone,
  graded_by       uuid REFERENCES public.profiles(id),
  CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id)
);

-- ── MODULE TESTS ─────────────────────────────────────────────
CREATE TABLE public.module_tests (
  id            uuid NOT NULL DEFAULT uuid_generate_v4(),
  module_id     uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title         character varying NOT NULL,
  description   text,
  instructions  text,
  time_limit    integer,
  max_attempts  integer DEFAULT 1,
  passing_score integer DEFAULT 70,
  is_active     boolean DEFAULT true,
  created_at    timestamp with time zone DEFAULT now(),
  updated_at    timestamp with time zone DEFAULT now(),
  CONSTRAINT module_tests_pkey PRIMARY KEY (id)
);

CREATE TABLE public.test_questions (
  id            uuid NOT NULL DEFAULT uuid_generate_v4(),
  test_id       uuid NOT NULL REFERENCES public.module_tests(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type public.question_type NOT NULL,
  points        integer DEFAULT 1,
  order_index   integer NOT NULL DEFAULT 0,
  options       jsonb,
  correct_answer text,
  explanation   text,
  created_at    timestamp with time zone DEFAULT now(),
  CONSTRAINT test_questions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.test_attempts (
  id             uuid NOT NULL DEFAULT uuid_generate_v4(),
  test_id        uuid NOT NULL REFERENCES public.module_tests(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  status         public.attempt_status DEFAULT 'in_progress',
  started_at     timestamp with time zone DEFAULT now(),
  completed_at   timestamp with time zone,
  score          integer,
  time_taken     integer,
  answers        jsonb,
  CONSTRAINT test_attempts_pkey PRIMARY KEY (id)
);

-- ── SUBJECT RESOURCES ────────────────────────────────────────
CREATE TABLE public.subject_resources (
  id            uuid NOT NULL DEFAULT uuid_generate_v4(),
  subject_id    uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_by    uuid REFERENCES public.profiles(id),
  updated_by    uuid REFERENCES public.profiles(id),
  title         character varying NOT NULL,
  resource_url  text NOT NULL,
  resource_type character varying NOT NULL DEFAULT 'link',
  description   text,
  file_size     bigint,
  file_type     character varying,
  order_index   integer NOT NULL DEFAULT 0,
  status        character varying NOT NULL DEFAULT 'active',
  created_at    timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at    timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT subject_resources_pkey PRIMARY KEY (id)
);

-- ── CLASS SESSIONS & ATTENDANCE ──────────────────────────────
CREATE TABLE public.class_sessions (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id          uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id         uuid REFERENCES public.subjects(id),
  peer_lead_id       uuid NOT NULL REFERENCES public.profiles(id),
  title              character varying NOT NULL,
  description        text,
  session_type       character varying DEFAULT 'lecture' CHECK (session_type = ANY (ARRAY['lecture','lab','workshop','exam','consultation'])),
  start_time         timestamp with time zone NOT NULL,
  end_time           timestamp with time zone NOT NULL,
  location_type      character varying DEFAULT 'physical' CHECK (location_type = ANY (ARRAY['physical','online','hybrid'])),
  room_number        character varying,
  online_meeting_url text,
  enrollment_type    character varying DEFAULT 'both',
  sections           text[],
  batch_numbers      integer[],
  grade_levels       integer[],
  strands            text[],
  status             character varying DEFAULT 'scheduled' CHECK (status = ANY (ARRAY['scheduled','ongoing','completed','cancelled'])),
  max_attendees      integer,
  notes              text,
  created_at         timestamp with time zone DEFAULT now(),
  updated_at         timestamp with time zone DEFAULT now(),
  CONSTRAINT class_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.class_attendance (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       character varying DEFAULT 'absent' CHECK (status = ANY (ARRAY['present','absent','late','excused'])),
  check_in_time timestamp with time zone,
  notes        text,
  created_at   timestamp with time zone DEFAULT now(),
  updated_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT class_attendance_pkey PRIMARY KEY (id)
);

-- ── FEATURE REQUESTS ─────────────────────────────────────────
CREATE TABLE public.feature_requests (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text NOT NULL,
  category    character varying NOT NULL CHECK (category = ANY (ARRAY['feature','bug'])),
  priority    character varying DEFAULT 'medium' CHECK (priority = ANY (ARRAY['low','medium','high','critical'])),
  status      character varying DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending','ongoing','finished'])),
  votes       integer DEFAULT 0,
  admin_notes text,
  created_at  timestamp with time zone DEFAULT now(),
  updated_at  timestamp with time zone DEFAULT now(),
  CONSTRAINT feature_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE public.feature_request_votes (
  id                 uuid NOT NULL DEFAULT gen_random_uuid(),
  feature_request_id uuid NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at         timestamp with time zone DEFAULT now(),
  CONSTRAINT feature_request_votes_pkey PRIMARY KEY (id)
);

-- ── REGISTRATION CODES ───────────────────────────────────────
CREATE TABLE public.registration_codes (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  code       character varying NOT NULL UNIQUE,
  created_by uuid REFERENCES public.profiles(id),
  used_by    uuid REFERENCES public.profiles(id),
  is_used    boolean DEFAULT false,
  used_at    timestamp with time zone,
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT registration_codes_pkey PRIMARY KEY (id)
);

CREATE TABLE public.verification_codes (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  email         character varying NOT NULL,
  code          character varying NOT NULL,
  first_name    character varying NOT NULL,
  last_name     character varying NOT NULL,
  password_hash text NOT NULL,
  user_type     character varying NOT NULL CHECK (user_type = ANY (ARRAY['student','instructor'])),
  created_at    timestamp with time zone DEFAULT now(),
  expires_at    timestamp with time zone DEFAULT (now() + interval '15 minutes'),
  verified      boolean DEFAULT false,
  CONSTRAINT verification_codes_pkey PRIMARY KEY (id)
);

-- ── SECTION SETTINGS ─────────────────────────────────────────
CREATE TABLE public.section_settings (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  section_id text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT section_settings_pkey PRIMARY KEY (id)
);

-- ── COURSE COLORS ────────────────────────────────────────────
CREATE TABLE public.available_colors (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  color_name   character varying NOT NULL UNIQUE,
  color_hex    character varying NOT NULL,
  bg_class     character varying NOT NULL,
  text_class   character varying NOT NULL,
  border_class character varying NOT NULL,
  is_used      boolean DEFAULT false,
  CONSTRAINT available_colors_pkey PRIMARY KEY (id)
);

CREATE TABLE public.course_colors (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id    uuid NOT NULL UNIQUE REFERENCES public.courses(id) ON DELETE CASCADE,
  color_name   character varying NOT NULL,
  color_hex    character varying NOT NULL,
  bg_class     character varying NOT NULL,
  text_class   character varying NOT NULL,
  border_class character varying NOT NULL,
  created_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT course_colors_pkey PRIMARY KEY (id)
);

CREATE TABLE public.batch_colors (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  batch_number integer NOT NULL UNIQUE,
  color_name   character varying NOT NULL,
  color_hex    character varying NOT NULL,
  bg_class     character varying NOT NULL,
  text_class   character varying NOT NULL,
  border_class character varying NOT NULL,
  created_at   timestamp with time zone DEFAULT now(),
  updated_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT batch_colors_pkey PRIMARY KEY (id)
);

-- ── FILE STORAGE ─────────────────────────────────────────────
CREATE TABLE public.file_storage (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  uploaded_by       uuid REFERENCES auth.users(id),
  filename          text NOT NULL,
  original_filename text NOT NULL,
  file_url          text NOT NULL,
  file_type         text NOT NULL,
  file_size         bigint NOT NULL,
  mime_type         text NOT NULL,
  created_at        timestamp with time zone DEFAULT now(),
  updated_at        timestamp with time zone DEFAULT now(),
  CONSTRAINT file_storage_pkey PRIMARY KEY (id)
);

-- ── MISC ─────────────────────────────────────────────────────
CREATE TABLE public.migration_log (
  id             uuid NOT NULL DEFAULT gen_random_uuid(),
  migration_name text NOT NULL UNIQUE,
  completed_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT migration_log_pkey PRIMARY KEY (id)
);

CREATE TABLE public.schema_version (
  id              uuid NOT NULL DEFAULT uuid_generate_v4(),
  version         character varying NOT NULL UNIQUE,
  description     text NOT NULL,
  applied_at      timestamp with time zone DEFAULT now(),
  migration_files text[] DEFAULT '{}',
  rollback_sql    text,
  created_at      timestamp with time zone DEFAULT now(),
  CONSTRAINT schema_version_pkey PRIMARY KEY (id)
);

-- ── ACTIVITY LOGS VIEW ───────────────────────────────────────
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

GRANT SELECT ON public.activity_logs_with_users TO anon, authenticated;

-- ── SEED: DEFAULT COLORS ─────────────────────────────────────
INSERT INTO public.available_colors (color_name, color_hex, bg_class, text_class, border_class) VALUES
  ('blue',   '#3B82F6', 'bg-blue-100',   'text-blue-700',   'border-blue-300'),
  ('green',  '#22C55E', 'bg-green-100',  'text-green-700',  'border-green-300'),
  ('purple', '#A855F7', 'bg-purple-100', 'text-purple-700', 'border-purple-300'),
  ('orange', '#F97316', 'bg-orange-100', 'text-orange-700', 'border-orange-300'),
  ('red',    '#EF4444', 'bg-red-100',    'text-red-700',    'border-red-300'),
  ('yellow', '#EAB308', 'bg-yellow-100', 'text-yellow-700', 'border-yellow-300'),
  ('teal',   '#14B8A6', 'bg-teal-100',   'text-teal-700',   'border-teal-300'),
  ('pink',   '#EC4899', 'bg-pink-100',   'text-pink-700',   'border-pink-300'),
  ('indigo', '#6366F1', 'bg-indigo-100', 'text-indigo-700', 'border-indigo-300'),
  ('gray',   '#6B7280', 'bg-gray-100',   'text-gray-700',   'border-gray-300');

-- ── RLS: OPEN POLICIES (custom auth — no auth.uid()) ─────────
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_schedules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lounge_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_tests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_attempts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_resources   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_colors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_colors       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_colors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_codes  ENABLE ROW LEVEL SECURITY;

-- Single open policy for each table (app enforces access control)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles','courses','subjects','modules',
    'course_enrollments','enrollments','subject_enrollments',
    'course_schedules','schedule_enrollments',
    'activity_logs','notifications',
    'lounge_chat_messages','course_chat_messages',
    'connections','user_presence','user_sessions',
    'posts','post_reactions','post_comments',
    'assignments','assignment_submissions',
    'module_tests','test_questions','test_attempts',
    'subject_resources','class_sessions','class_attendance',
    'feature_requests','feature_request_votes',
    'available_colors','course_colors','batch_colors',
    'section_settings','registration_codes'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "open_access" ON public.%I', t);
    EXECUTE format('CREATE POLICY "open_access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
