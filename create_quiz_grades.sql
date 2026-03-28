-- Quiz/Exam grades table
create table if not exists quiz_grades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  module_id text not null,           -- module id (stored as text since modules use text PKs)
  subject_id text,
  course_id text,
  quiz_type text not null check (quiz_type in ('quiz', 'exam')),
  quiz_title text,
  score integer not null,            -- number of correct answers
  total integer not null,            -- total questions
  percentage numeric(5,2) not null,  -- 0.00 - 100.00
  passed boolean not null,
  time_taken_seconds integer,        -- how long they took
  try_number integer not null default 1,
  answers jsonb,                     -- snapshot of answers for review
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Index for fast lookups per student and per module
create index if not exists idx_quiz_grades_user_id on quiz_grades(user_id);
create index if not exists idx_quiz_grades_module_id on quiz_grades(module_id);
create index if not exists idx_quiz_grades_user_module on quiz_grades(user_id, module_id);

-- RLS
alter table quiz_grades enable row level security;

-- Students can read their own grades
create policy "students_read_own_grades" on quiz_grades
  for select using (user_id = auth.uid());

-- Students can insert their own grades
create policy "students_insert_own_grades" on quiz_grades
  for insert with check (user_id = auth.uid());

-- Admin, developer, instructor can read all grades
create policy "staff_read_all_grades" on quiz_grades
  for select using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('admin', 'developer', 'instructor')
    )
  );

-- Convenience view for staff to see grades with student names
create or replace view quiz_grades_with_names as
  select
    qg.*,
    p.first_name,
    p.last_name,
    p.email
  from quiz_grades qg
  left join profiles p on p.id = qg.user_id;
