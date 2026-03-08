-- Migration: Role System Update - Enum Type Update
-- Description: Update user_role enum type to include new roles
-- Date: 2026-03-08
-- Author: System Migration

-- ============================================
-- STEP 1: ADD NEW ROLE VALUES TO ENUM
-- ============================================

-- Add 'student' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'student' 
        AND enumtypid = 'user_role'::regtype
    ) THEN
        ALTER TYPE user_role ADD VALUE 'student';
        RAISE NOTICE 'Added student to user_role enum';
    ELSE
        RAISE NOTICE 'student already exists in user_role enum';
    END IF;
END $$;

-- Add 'scholar' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'scholar' 
        AND enumtypid = 'user_role'::regtype
    ) THEN
        ALTER TYPE user_role ADD VALUE 'scholar';
        RAISE NOTICE 'Added scholar to user_role enum';
    ELSE
        RAISE NOTICE 'scholar already exists in user_role enum';
    END IF;
END $$;

-- Add 'guest' if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'guest' 
        AND enumtypid = 'user_role'::regtype
    ) THEN
        ALTER TYPE user_role ADD VALUE 'guest';
        RAISE NOTICE 'Added guest to user_role enum';
    ELSE
        RAISE NOTICE 'guest already exists in user_role enum';
    END IF;
END $$;

-- ============================================
-- STEP 2: VERIFY ENUM VALUES
-- ============================================

DO $$
DECLARE
    enum_values TEXT;
BEGIN
    SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
    INTO enum_values
    FROM pg_enum
    WHERE enumtypid = 'user_role'::regtype;
    
    RAISE NOTICE 'Current user_role enum values: %', enum_values;
END $$;

-- ============================================
-- STEP 3: REMOVE OLD ENUM VALUES (OPTIONAL)
-- ============================================

-- Note: PostgreSQL does not support removing enum values directly
-- Old values (trainee, tesda_scholar) will remain in the enum but won't be used
-- This is safe and doesn't affect functionality

-- To completely remove old enum values, you would need to:
-- 1. Create a new enum type with only the new values
-- 2. Alter all columns to use the new type
-- 3. Drop the old enum type
-- This is complex and risky, so we keep the old values in the enum

COMMENT ON TYPE user_role IS 'User roles: admin, developer, instructor, scholar, student, guest. Legacy values (trainee, tesda_scholar) are deprecated but remain for compatibility.';

-- ============================================
-- NOTES
-- ============================================

-- This script updates the user_role enum type
-- New values are added: student, scholar, guest
-- Old values (trainee, tesda_scholar) remain but are deprecated
-- Run this AFTER updating the data (101_role_migration_update_data.sql)
-- Run this BEFORE updating RLS policies (103_role_migration_update_policies.sql)
