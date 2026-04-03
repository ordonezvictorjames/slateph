-- User badges table: one row per user per course per badge type
create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  badge_type text not null check (badge_type in ('bronze', 'silver', 'gold')),
  awarded_at timestamptz not null default now(),
  unique (user_id, course_id, badge_type)
);

-- Index for fast lookups by user
create index if not exists user_badges_user_id_idx on user_badges(user_id);

-- RLS
alter table user_badges enable row level security;

-- Students can read their own badges; anyone can read badges (for profile views)
create policy "Users can read all badges" on user_badges
  for select using (true);

-- Only the system (service role) or the user themselves can insert/update
create policy "Users can upsert own badges" on user_badges
  for insert with check (auth.uid() = user_id);

create policy "Users can update own badges" on user_badges
  for update using (auth.uid() = user_id);
