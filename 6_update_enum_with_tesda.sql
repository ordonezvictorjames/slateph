-- Update enum to include admin, instructor, trainee, tesda_scholar, developer
-- Date: February 27, 2026

-- Remove the default value temporarily
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Rename the old enum type
ALTER TYPE user_role RENAME TO user_role_old;

-- Create the new enum type with all needed roles
CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'trainee', 'tesda_scholar', 'developer');

-- Update the column to use the new type and migrate existing data
ALTER TABLE profiles 
  ALTER COLUMN role TYPE user_role 
  USING 
    CASE 
      WHEN role::text = 'peer_lead' THEN 'instructor'::user_role
      WHEN role::text = 'participant' THEN 'trainee'::user_role
      WHEN role::text = 'student' THEN 'trainee'::user_role
      WHEN role::text = 'instructor' THEN 'instructor'::user_role
      WHEN role::text = 'teacher' THEN 'instructor'::user_role
      WHEN role::text = 'tesda_scholar' THEN 'tesda_scholar'::user_role
      WHEN role::text = 'admin' THEN 'admin'::user_role
      WHEN role::text = 'developer' THEN 'developer'::user_role
      ELSE 'trainee'::user_role
    END;

-- Set the new default value
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'trainee'::user_role;

-- Drop the old enum type
DROP TYPE user_role_old;

-- Update the constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['admin'::user_role, 'instructor'::user_role, 'trainee'::user_role, 'tesda_scholar'::user_role, 'developer'::user_role]));

-- Verify the migration
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role 
ORDER BY role;
