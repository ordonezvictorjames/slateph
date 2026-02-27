-- Update enrollment_type to include 'tesda_scholar'
-- This migration drops the CHECK constraint and adds the new enum value

-- Step 1: Drop the CHECK constraint on courses table
ALTER TABLE courses 
DROP CONSTRAINT IF EXISTS courses_enrollment_type_check;

-- Step 2: Drop the CHECK constraint on subjects table
ALTER TABLE subjects 
DROP CONSTRAINT IF EXISTS subjects_enrollment_type_check;

-- Step 3: Add 'tesda_scholar' to the enrollment_type enum if it doesn't already exist
DO $$ 
BEGIN
    -- Check if the enum value already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'tesda_scholar' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enrollment_type')
    ) THEN
        -- Add the new enum value
        ALTER TYPE enrollment_type ADD VALUE 'tesda_scholar';
    END IF;
END $$;

-- Step 4: Re-add the CHECK constraint with the new value for courses
ALTER TABLE courses 
ADD CONSTRAINT courses_enrollment_type_check 
CHECK (enrollment_type IN ('student', 'tesda_scholar', 'both'));

-- Step 5: Re-add the CHECK constraint with the new value for subjects
ALTER TABLE subjects 
ADD CONSTRAINT subjects_enrollment_type_check 
CHECK (enrollment_type IN ('student', 'tesda_scholar', 'both'));
