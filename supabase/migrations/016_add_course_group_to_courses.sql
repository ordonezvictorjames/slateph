-- Add course_group column to courses table
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS course_group TEXT NULL;

-- Add a check constraint to ensure valid course groups
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

-- Create an index on course_group for better query performance
CREATE INDEX IF NOT EXISTS idx_courses_course_group 
ON public.courses USING btree (course_group);

-- Add comment to document the column
COMMENT ON COLUMN public.courses.course_group IS 'Course category/group for classification and filtering';
