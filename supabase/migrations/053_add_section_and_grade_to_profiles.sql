-- Add section and grade columns to profiles table for students
-- Section will store scientist surnames, grade will store integer grade level

-- Add section column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS section TEXT;

-- Add grade column (integer only)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade INTEGER;

-- Add check constraint to ensure grade is between 1 and 12 (typical grade levels)
ALTER TABLE profiles ADD CONSTRAINT grade_range CHECK (grade IS NULL OR (grade >= 1 AND grade <= 12));

-- Add comment for documentation
COMMENT ON COLUMN profiles.section IS 'Student section assignment (scientist surname)';
COMMENT ON COLUMN profiles.grade IS 'Student grade level (1-12)';
