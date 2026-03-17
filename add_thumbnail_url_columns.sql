-- Add thumbnail_url to courses, subjects, and modules tables
ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE modules ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
