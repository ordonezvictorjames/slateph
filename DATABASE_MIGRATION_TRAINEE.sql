-- Migration: Update user roles to use 'trainee' instead of peer_lead, participant, teacher
-- Date: February 27, 2026

-- Step 1: Remove the default value temporarily
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Step 2: Update the user_role enum type
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('admin', 'trainee', 'developer');

-- Step 3: Update existing data (convert old roles to new ones)
-- Convert peer_lead, participant, teacher, student, instructor, tesda_scholar to trainee
UPDATE profiles 
SET role = 'trainee'::text 
WHERE role::text IN ('peer_lead', 'participant', 'teacher', 'student', 'instructor', 'tesda_scholar');

-- Step 4: Update the column type
ALTER TABLE profiles 
  ALTER COLUMN role TYPE user_role 
  USING role::text::user_role;

-- Step 5: Drop the old type
DROP TYPE user_role_old;

-- Step 6: Set the new default value
ALTER TABLE profiles 
  ALTER COLUMN role SET DEFAULT 'trainee'::user_role;

-- Step 7: Update the constraint
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['admin'::user_role, 'trainee'::user_role, 'developer'::user_role]));

-- Verification query (run this to check the migration)
-- SELECT role, COUNT(*) FROM profiles GROUP BY role;
