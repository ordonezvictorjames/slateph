-- Download Center: stores downloadable files/links for all users
CREATE TABLE IF NOT EXISTS download_center (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,          -- direct download URL or external link
  file_type VARCHAR(50) DEFAULT 'file', -- 'file', 'link', 'document'
  file_size BIGINT,                -- bytes, optional
  category VARCHAR(100),           -- e.g. 'Forms', 'Modules', 'References'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE download_center DISABLE ROW LEVEL SECURITY;

GRANT ALL ON download_center TO anon;
GRANT ALL ON download_center TO authenticated;

CREATE INDEX IF NOT EXISTS idx_download_center_category ON download_center(category);
CREATE INDEX IF NOT EXISTS idx_download_center_created_at ON download_center(created_at DESC);
