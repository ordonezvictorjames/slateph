-- Update course_group constraint to use academic subjects instead of tech categories

-- First, drop the old constraint (using DO block to handle if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'courses_course_group_check'
    ) THEN
        ALTER TABLE public.courses DROP CONSTRAINT courses_course_group_check;
    END IF;
END $$;

-- Update existing courses with old categories to map to new academic subjects
-- Map old tech categories to 'Computer' or 'Others'
UPDATE public.courses
SET course_group = CASE
    WHEN course_group IN (
        'Programming',
        'Web Development',
        'Mobile Development',
        'Data Science & AI',
        'Networking & Cybersecurity',
        'Software Tools',
        'Game Development'
    ) THEN 'Computer'
    WHEN course_group IN (
        'Robotics',
        'Automation & Control',
        'Engineering & Technology'
    ) THEN 'T.L.E'
    ELSE 'Others'
END
WHERE course_group IN (
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
);

-- Add new constraint with academic subjects
ALTER TABLE public.courses
ADD CONSTRAINT courses_course_group_check 
CHECK (
  course_group IS NULL OR 
  course_group IN (
    'Math',
    'English',
    'Computer',
    'Filipino',
    'Science',
    'History',
    'T.L.E',
    'H.E',
    'Others'
  )
);

-- Update comment to reflect new purpose
COMMENT ON COLUMN public.courses.course_group IS 'Academic subject category for course classification';
