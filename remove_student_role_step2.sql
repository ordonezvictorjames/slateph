-- STEP 2: Migrate data and remove 'student' from enum
-- Run this ONLY after step1 has fully completed

-- Migrate existing 'student' users to 'shs_student'
UPDATE profiles
SET role = 'shs_student'
WHERE role = 'student';

-- Recreate enum without 'student'
ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM (
  'admin',
  'developer',
  'instructor',
  'shs_student',
  'jhs_student',
  'college_student',
  'scholar',
  'guest'
);

-- Update profiles column to use new enum
ALTER TABLE profiles
  ALTER COLUMN role TYPE user_role
  USING role::text::user_role;

-- Drop old enum
DROP TYPE user_role_old;

-- Verify
SELECT role, COUNT(*) FROM profiles GROUP BY role ORDER BY role;
