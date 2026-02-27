-- Ensure instructor_id column exists in subjects table
-- Instructors are assigned per subject, not per course

-- Add instructor_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subjects' AND column_name = 'instructor_id'
  ) THEN
    ALTER TABLE public.subjects ADD COLUMN instructor_id UUID;
    
    -- Add foreign key constraint to profiles table
    ALTER TABLE public.subjects 
    ADD CONSTRAINT subjects_instructor_id_fkey 
    FOREIGN KEY (instructor_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;
    
    -- Create index for better query performance
    CREATE INDEX idx_subjects_instructor_id ON public.subjects(instructor_id);
  END IF;
END $$;

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'subjects' 
  AND column_name = 'instructor_id';

-- Show sample of subjects table structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'subjects'
ORDER BY ordinal_position;
