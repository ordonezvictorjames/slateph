-- Migration: Role System Update - Data Migration
-- Description: Update all user roles from old to new values
-- Date: 2026-03-08
-- Author: System Migration

-- ============================================
-- STEP 1: UPDATE USER ROLES IN PROFILES TABLE
-- ============================================

-- Update trainee to student
UPDATE profiles 
SET role = 'student' 
WHERE role = 'trainee';

-- Update tesda_scholar to scholar
UPDATE profiles 
SET role = 'scholar' 
WHERE role = 'tesda_scholar';

-- ============================================
-- STEP 2: LOG MIGRATION RESULTS
-- ============================================

DO $$
DECLARE
    role_stats TEXT;
    total_users INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM profiles;
    
    SELECT string_agg(role || ': ' || count::text, ', ')
    INTO role_stats
    FROM (
        SELECT role, COUNT(*) as count 
        FROM profiles 
        GROUP BY role 
        ORDER BY role
    ) stats;
    
    RAISE NOTICE 'Migration complete. Total users: %', total_users;
    RAISE NOTICE 'New role distribution: %', role_stats;
END $$;

-- ============================================
-- STEP 3: VERIFY NO OLD ROLES REMAIN
-- ============================================

DO $$
DECLARE
    old_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_role_count 
    FROM profiles 
    WHERE role IN ('trainee', 'tesda_scholar');
    
    IF old_role_count > 0 THEN
        RAISE WARNING 'Found % users with old roles still present', old_role_count;
    ELSE
        RAISE NOTICE 'Verification passed: No old roles found';
    END IF;
END $$;

-- ============================================
-- STEP 4: UPDATE ENROLLMENT TYPES (IF APPLICABLE)
-- ============================================

-- Update enrollment_type in courses table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'enrollment_type'
    ) THEN
        -- Update enrollment types
        UPDATE courses 
        SET enrollment_type = 'student' 
        WHERE enrollment_type = 'trainee';
        
        UPDATE courses 
        SET enrollment_type = 'scholar' 
        WHERE enrollment_type = 'tesda_scholar';
        
        RAISE NOTICE 'Updated enrollment_type in courses table';
    END IF;
END $$;

-- Update enrollment_type in subjects table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' 
        AND column_name = 'enrollment_type'
    ) THEN
        UPDATE subjects 
        SET enrollment_type = 'student' 
        WHERE enrollment_type = 'trainee';
        
        UPDATE subjects 
        SET enrollment_type = 'scholar' 
        WHERE enrollment_type = 'tesda_scholar';
        
        RAISE NOTICE 'Updated enrollment_type in subjects table';
    END IF;
END $$;

-- ============================================
-- NOTES
-- ============================================

-- This script updates all user role data
-- Old roles (trainee, tesda_scholar) are converted to new roles (student, scholar)
-- Run this AFTER creating backups (100_role_migration_backup.sql)
-- Run this BEFORE updating the enum type (102_role_migration_update_enum.sql)
