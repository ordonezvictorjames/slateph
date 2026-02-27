-- =============================================
-- REVERT COURSE GROUP CONSTRAINT
-- Change back to tech categories instead of academic subjects
-- =============================================

-- Drop the academic subjects constraint
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'courses_course_group_check'
    ) THEN
        ALTER TABLE public.courses DROP CONSTRAINT courses_course_group_check;
    END IF;
END $$;

-- Add new constraint with tech categories (matching the UI dropdown)
ALTER TABLE public.courses
ADD CONSTRAINT courses_course_group_check 
CHECK (
  course_group IS NULL OR 
  course_group IN (
    'Programming',
    'Web Development',
    'Mobile Development',
    'Robotics',
    'Automation & Control',
    'Data Science & AI',
    'Networking & Cybersecurity',
    'Software Tools',
    'Game Development',
    'Engineering & Technology'
  )
);

-- Update comment to reflect purpose
COMMENT ON COLUMN public.courses.course_group IS 'Technology category for course classification';
