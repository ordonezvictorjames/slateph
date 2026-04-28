-- Add plain text title columns to avoid FK join issues
ALTER TABLE library_links
  ADD COLUMN IF NOT EXISTS course_title TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS subject_title TEXT DEFAULT '';
