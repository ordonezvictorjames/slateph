-- Update course_schedules schema for class-based scheduling
-- Run this in your Supabase SQL editor

-- 1. Drop old enrollment_type constraint
ALTER TABLE course_schedules
  DROP CONSTRAINT IF EXISTS course_schedules_enrollment_type_check;

-- 2. Add new constraint with all user types
ALTER TABLE course_schedules
  ADD CONSTRAINT course_schedules_enrollment_type_check
  CHECK (enrollment_type IN ('jhs_student', 'shs_student', 'college_student', 'tesda_scholar', 'trainee', 'both'));

-- 3. Add class info columns
ALTER TABLE course_schedules
  ADD COLUMN IF NOT EXISTS grade   TEXT,
  ADD COLUMN IF NOT EXISTS section TEXT,
  ADD COLUMN IF NOT EXISTS cluster TEXT,
  ADD COLUMN IF NOT EXISTS strand  TEXT,
  ADD COLUMN IF NOT EXISTS batch   TEXT;

-- 4. Make batch_number nullable (no longer auto-generated)
ALTER TABLE course_schedules
  ALTER COLUMN batch_number DROP NOT NULL;

-- 5. Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'course_schedules'
ORDER BY ordinal_position;
