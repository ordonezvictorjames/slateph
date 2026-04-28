-- Add course_id to library_links for course/subject filtering
-- (library_links table created in this migration)

CREATE TABLE IF NOT EXISTS library_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE library_links DISABLE ROW LEVEL SECURITY;

GRANT ALL ON library_links TO anon;
GRANT ALL ON library_links TO authenticated;

CREATE INDEX IF NOT EXISTS idx_library_links_created_at ON library_links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_library_links_course ON library_links(course_id);
CREATE INDEX IF NOT EXISTS idx_library_links_subject ON library_links(subject_id);
