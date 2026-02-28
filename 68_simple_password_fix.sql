-- =============================================
-- SIMPLE PASSWORD FIX
-- Just fix users without passwords
-- =============================================

-- Check for users without passwords
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  CASE 
    WHEN password IS NULL THEN 'NO PASSWORD SET ❌'
    ELSE 'PASSWORD EXISTS ✓'
  END as password_status
FROM profiles
WHERE password IS NULL
ORDER BY created_at DESC;

-- Fix: Set default password for users without passwords
UPDATE profiles 
SET password = crypt('Slate2026!', gen_salt('bf')), 
    status = 'active' 
WHERE password IS NULL;

-- Verify the fix
SELECT 
  email,
  role,
  status,
  CASE 
    WHEN password IS NULL THEN 'NO PASSWORD ❌'
    ELSE 'HAS PASSWORD ✓'
  END as pwd_status
FROM profiles
ORDER BY created_at DESC;
