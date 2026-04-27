-- Course announcements: one announcement per course, editable by admin/developer/instructor
CREATE TABLE IF NOT EXISTS course_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id)
);

-- RLS: everyone can read, only admin/developer/instructor can write
ALTER TABLE course_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_read_all" ON course_announcements
  FOR SELECT USING (true);

CREATE POLICY "announcements_write_staff" ON course_announcements
  FOR ALL USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS idx_course_announcements_course_id ON course_announcements(course_id);
