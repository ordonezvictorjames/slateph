-- =============================================
-- QUICK FIX FOR LOGIN ERROR
-- Run this in Supabase SQL Editor
-- =============================================

-- Step 1: Check which users don't have passwords
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
ORDER BY created_at DESC;

-- Step 2: Set default password for all users without passwords
-- Uncomment the line below to execute
-- UPDATE profiles SET password = crypt('Slate2026!', gen_salt('bf')), status = 'active' WHERE password IS NULL;

-- Step 3: Verify all users now have passwords
-- SELECT email, role, status, CASE WHEN password IS NULL THEN 'NO PASSWORD' ELSE 'HAS PASSWORD' END as pwd_status FROM profiles ORDER BY created_at DESC;
