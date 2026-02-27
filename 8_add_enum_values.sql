-- Add missing enum values to existing user_role enum
-- This is a simpler approach that just adds the missing values
-- Date: February 27, 2026

-- Add 'instructor' if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'instructor' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'instructor';
    END IF;
END $$;

-- Add 'trainee' if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'trainee' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'trainee';
    END IF;
END $$;

-- Verify the enum values
SELECT enumlabel as role_value
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Check current roles in use
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role 
ORDER BY role;
