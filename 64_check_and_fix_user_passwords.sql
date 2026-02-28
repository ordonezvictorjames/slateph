-- =============================================
-- CHECK AND FIX USER PASSWORDS
-- Find users without passwords and provide options to fix them
-- =============================================

-- 1. Check for users without passwords
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  CASE 
    WHEN password IS NULL THEN 'NO PASSWORD SET'
    ELSE 'PASSWORD EXISTS'
  END as password_status
FROM profiles
WHERE password IS NULL
ORDER BY created_at DESC;

-- 2. If you need to set a default password for users without passwords
-- Uncomment and run this to set a default password (e.g., "TempPass123!")
-- IMPORTANT: Users should change this password after first login

/*
UPDATE profiles
SET password = crypt('TempPass123!', gen_salt('bf'))
WHERE password IS NULL;
*/

-- 3. Or set individual passwords for specific users
-- Replace 'user@example.com' with the actual email and 'NewPassword123!' with desired password

/*
UPDATE profiles
SET password = crypt('NewPassword123!', gen_salt('bf'))
WHERE email = 'user@example.com' AND password IS NULL;
*/

-- 4. Verify the update
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  CASE 
    WHEN password IS NULL THEN 'NO PASSWORD SET'
    ELSE 'PASSWORD EXISTS'
  END as password_status
FROM profiles
ORDER BY created_at DESC;
