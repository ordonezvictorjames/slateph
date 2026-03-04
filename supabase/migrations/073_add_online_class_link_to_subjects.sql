-- Add online_class_link column to subjects table
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS online_class_link TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN subjects.online_class_link IS 'URL for online class (Google Meet, Zoom, etc.)';
