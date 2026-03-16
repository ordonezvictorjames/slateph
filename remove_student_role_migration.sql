-- ============================================================
-- MIGRATION: Replace 'student' role with shs_student, jhs_student, college_student
-- 
-- IMPORTANT: Run each STEP separately in Supabase SQL Editor.
-- Each step must be committed before running the next.
-- ============================================================

-- ============================================================
-- STEP 1: Add new enum values (run this first, then commit)
-- ============================================================
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'shs_student';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'jhs_student';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'college_student';


-- ============================================================
-- STEP 2: Migrate existing 'student' users (run AFTER step 1 is committed)
-- ============================================================
UPDATE profiles
SET role = 'shs_student'
WHERE role = 'student';


-- ============================================================
-- STEP 3: Remove 'student' from enum (run AFTER step 2 is committed)
-- PostgreSQL can't DROP VALUE directly — must recreate the enum
-- ============================================================

-- Rename old enum
ALTER TYPE user_role RENAME TO user_role_old;

-- Create new enum without 'student'
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


-- ============================================================
-- STEP 4: Verify (run after all steps complete)
-- ============================================================
SELECT role, COUNT(*) FROM profiles GROUP BY role ORDER BY role;
