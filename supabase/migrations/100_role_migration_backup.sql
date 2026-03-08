-- Migration: Role System Update - Backup
-- Description: Create backup tables before role migration
-- Date: 2026-03-08
-- Author: System Migration

-- ============================================
-- STEP 1: CREATE BACKUP TABLES
-- ============================================

-- Backup profiles table
CREATE TABLE IF NOT EXISTS profiles_backup_20260308 AS 
SELECT * FROM profiles;

-- Backup enrollments table (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments') THEN
        EXECUTE 'CREATE TABLE IF NOT EXISTS enrollments_backup_20260308 AS SELECT * FROM enrollments';
        RAISE NOTICE 'Enrollments table backed up';
    ELSE
        RAISE NOTICE 'Enrollments table does not exist - skipping backup';
    END IF;
END $$;

-- ============================================
-- STEP 2: DOCUMENT CURRENT STATE
-- ============================================

-- Log current role distribution
DO $$
DECLARE
    role_stats TEXT;
BEGIN
    SELECT string_agg(role || ': ' || count::text, ', ')
    INTO role_stats
    FROM (
        SELECT role, COUNT(*) as count 
        FROM profiles 
        GROUP BY role 
        ORDER BY role
    ) stats;
    
    RAISE NOTICE 'Current role distribution: %', role_stats;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify backup was created
DO $$
DECLARE
    backup_count INTEGER;
    original_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM profiles_backup_20260308;
    SELECT COUNT(*) INTO original_count FROM profiles;
    
    IF backup_count = original_count THEN
        RAISE NOTICE 'Backup successful: % records backed up', backup_count;
    ELSE
        RAISE EXCEPTION 'Backup failed: backup has % records but original has %', 
            backup_count, original_count;
    END IF;
END $$;

-- ============================================
-- NOTES
-- ============================================

-- This script creates backup tables before the role migration
-- Backup tables are named with _backup_20260308 suffix
-- Run this BEFORE running the main migration script
-- To restore from backup if needed:
--   DROP TABLE profiles;
--   ALTER TABLE profiles_backup_20260308 RENAME TO profiles;
