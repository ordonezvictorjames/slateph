-- Add is_locked column to subjects table
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN subjects.is_locked IS 'When true, only admin/developer/instructor can access. Trainees and scholars are blocked.';

-- Update existing subjects to be unlocked by default
UPDATE subjects SET is_locked = false WHERE is_locked IS NULL;
