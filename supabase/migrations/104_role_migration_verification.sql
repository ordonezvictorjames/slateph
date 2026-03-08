-- Migration: Role System Update - Verification & Cleanup
-- Description: Verify migration success and provide rollback instructions
-- Date: 2026-03-08
-- Author: System Migration

-- ============================================
-- VERIFICATION CHECKS
-- ============================================

-- Check 1: Verify no users have old roles
DO $$
DECLARE
    old_role_count INTEGER;
    role_distribution TEXT;
BEGIN
    SELECT COUNT(*) INTO old_role_count
    FROM profiles
    WHERE role IN ('trainee', 'tesda_scholar');
    
    IF old_role_count > 0 THEN
        RAISE WARNING 'FAILED: Found % users with old roles', old_role_count;
    ELSE
        RAISE NOTICE 'PASSED: No users with old roles found';
    END IF;
    
    -- Show current distribution
    SELECT string_agg(role || ': ' || count::text, ', ')
    INTO role_distribution
    FROM (
        SELECT role, COUNT(*) as count 
        FROM profiles 
        GROUP BY role 
        ORDER BY role
    ) stats;
    
    RAISE NOTICE 'Current role distribution: %', role_distribution;
END $$;

-- Check 2: Verify enum contains new values
DO $$
DECLARE
    has_student BOOLEAN;
    has_scholar BOOLEAN;
    has_guest BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'student' 
        AND enumtypid = 'user_role'::regtype
    ) INTO has_student;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'scholar' 
        AND enumtypid = 'user_role'::regtype
    ) INTO has_scholar;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'guest' 
        AND enumtypid = 'user_role'::regtype
    ) INTO has_guest;
    
    IF has_student AND has_scholar AND has_guest THEN
        RAISE NOTICE 'PASSED: All new enum values exist';
    ELSE
        RAISE WARNING 'FAILED: Missing enum values - student:%, scholar:%, guest:%', 
            has_student, has_scholar, has_guest;
    END IF;
END $$;

-- Check 3: Compare backup vs current
DO $$
DECLARE
    backup_count INTEGER;
    current_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM profiles_backup_20260308;
    SELECT COUNT(*) INTO current_count FROM profiles;
    
    IF backup_count = current_count THEN
        RAISE NOTICE 'PASSED: User count matches (backup: %, current: %)', 
            backup_count, current_count;
    ELSE
        RAISE WARNING 'WARNING: User count mismatch (backup: %, current: %)', 
            backup_count, current_count;
    END IF;
END $$;

-- Check 4: Verify enrollment types updated
DO $$
DECLARE
    old_enrollment_count INTEGER := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'enrollment_type'
    ) THEN
        SELECT COUNT(*) INTO old_enrollment_count
        FROM courses
        WHERE enrollment_type IN ('trainee', 'tesda_scholar');
        
        IF old_enrollment_count > 0 THEN
            RAISE WARNING 'FAILED: Found % courses with old enrollment types', old_enrollment_count;
        ELSE
            RAISE NOTICE 'PASSED: No courses with old enrollment types';
        END IF;
    ELSE
        RAISE NOTICE 'SKIPPED: enrollment_type column does not exist in courses table';
    END IF;
END $$;

-- ============================================
-- MIGRATION SUMMARY
-- ============================================

DO $$
DECLARE
    summary TEXT;
BEGIN
    summary := E'\n' ||
        '========================================\n' ||
        'ROLE MIGRATION SUMMARY\n' ||
        '========================================\n' ||
        'Migration Date: ' || NOW()::TEXT || E'\n' ||
        'Status: Complete\n' ||
        E'\n' ||
        'Changes Made:\n' ||
        '- Updated user roles: trainee → student\n' ||
        '- Updated user roles: tesda_scholar → scholar\n' ||
        '- Added new role: guest\n' ||
        '- Updated enum type: user_role\n' ||
        '- Updated RLS policies\n' ||
        '- Updated functions\n' ||
        E'\n' ||
        'Backup Tables Created:\n' ||
        '- profiles_backup_20260308\n' ||
        '- enrollments_backup_20260308\n' ||
        E'\n' ||
        'Next Steps:\n' ||
        '1. Test application with all role types\n' ||
        '2. Verify sidebar displays correctly\n' ||
        '3. Test user creation with new roles\n' ||
        '4. Monitor for any issues\n' ||
        '5. After 30 days, consider dropping backup tables\n' ||
        '========================================';
    
    RAISE NOTICE '%', summary;
END $$;

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================

COMMENT ON TABLE profiles_backup_20260308 IS 
'Backup of profiles table before role migration on 2026-03-08. 
To rollback:
1. DROP TABLE profiles;
2. ALTER TABLE profiles_backup_20260308 RENAME TO profiles;
3. Restart application
Keep this backup for at least 30 days.';

-- ============================================
-- CLEANUP (Run after 30 days if migration successful)
-- ============================================

-- DO NOT RUN IMMEDIATELY - Wait 30 days to ensure migration is stable
-- 
-- DROP TABLE IF EXISTS profiles_backup_20260308;
-- DROP TABLE IF EXISTS enrollments_backup_20260308;
-- 
-- RAISE NOTICE 'Backup tables dropped - migration cleanup complete';

-- ============================================
-- NOTES
-- ============================================

-- This script verifies the migration was successful
-- Run this AFTER all other migration scripts
-- Review all PASSED/FAILED messages
-- Keep backup tables for at least 30 days
-- Test thoroughly before considering migration complete
