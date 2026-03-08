-- Migration: Role System Update - RLS Policies Update
-- Description: Update Row Level Security policies to use new role names
-- Date: 2026-03-08
-- Author: System Migration

-- ============================================
-- STEP 1: FIND AND UPDATE POLICIES
-- ============================================

-- List all policies that reference old roles
DO $$
DECLARE
    policy_record RECORD;
    policy_count INTEGER := 0;
BEGIN
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname, definition
        FROM pg_policies
        WHERE definition LIKE '%trainee%' 
           OR definition LIKE '%tesda_scholar%'
    LOOP
        RAISE NOTICE 'Policy to review: %.% - %', 
            policy_record.schemaname, 
            policy_record.tablename, 
            policy_record.policyname;
        policy_count := policy_count + 1;
    END LOOP;
    
    IF policy_count = 0 THEN
        RAISE NOTICE 'No policies found referencing old roles';
    ELSE
        RAISE NOTICE 'Found % policies referencing old roles', policy_count;
    END IF;
END $$;

-- ============================================
-- STEP 2: UPDATE COMMON POLICIES
-- ============================================

-- Example: Update policies for profiles table
-- Note: Adjust these based on your actual policy names

-- Drop and recreate policies that reference trainee
DO $$
BEGIN
    -- Check if policy exists before dropping
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname LIKE '%trainee%'
    ) THEN
        -- Drop old policy
        EXECUTE 'DROP POLICY IF EXISTS trainee_view_own_profile ON profiles';
        
        -- Create new policy with student
        CREATE POLICY student_view_own_profile ON profiles
            FOR SELECT
            USING (auth.uid() = id AND role = 'student');
            
        RAISE NOTICE 'Updated trainee policy to student policy';
    END IF;
END $$;

-- Update policies for scholar (if they exist)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname LIKE '%tesda_scholar%'
    ) THEN
        EXECUTE 'DROP POLICY IF EXISTS tesda_scholar_view_own_profile ON profiles';
        
        CREATE POLICY scholar_view_own_profile ON profiles
            FOR SELECT
            USING (auth.uid() = id AND role = 'scholar');
            
        RAISE NOTICE 'Updated tesda_scholar policy to scholar policy';
    END IF;
END $$;

-- ============================================
-- STEP 3: UPDATE FUNCTIONS
-- ============================================

-- Find functions that reference old roles
DO $$
DECLARE
    func_record RECORD;
    func_count INTEGER := 0;
BEGIN
    FOR func_record IN 
        SELECT routine_name, routine_definition
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND (
            routine_definition LIKE '%trainee%' 
            OR routine_definition LIKE '%tesda_scholar%'
        )
    LOOP
        RAISE NOTICE 'Function to review: %', func_record.routine_name;
        func_count := func_count + 1;
    END LOOP;
    
    IF func_count = 0 THEN
        RAISE NOTICE 'No functions found referencing old roles';
    ELSE
        RAISE NOTICE 'Found % functions referencing old roles - manual review needed', func_count;
    END IF;
END $$;

-- ============================================
-- STEP 4: UPDATE create_user_account FUNCTION
-- ============================================

-- Update the create_user_account function to accept new roles
CREATE OR REPLACE FUNCTION create_user_account(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_password TEXT,
    p_role user_role DEFAULT 'guest'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_password_hash TEXT;
    v_result JSON;
BEGIN
    -- Validate role
    IF p_role NOT IN ('admin', 'developer', 'instructor', 'scholar', 'student', 'guest') THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid role. Must be: admin, developer, instructor, scholar, student, or guest'
        );
    END IF;

    -- Generate UUID for new user
    v_user_id := gen_random_uuid();
    
    -- Hash the password using crypt
    v_password_hash := crypt(p_password, gen_salt('bf'));
    
    -- Insert into profiles table
    INSERT INTO profiles (
        id,
        email,
        first_name,
        last_name,
        role,
        password_hash,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        p_email,
        p_first_name,
        p_last_name,
        p_role,
        v_password_hash,
        'active',
        NOW(),
        NOW()
    );
    
    -- Return success with user data
    v_result := json_build_object(
        'success', true,
        'message', 'User account created successfully',
        'user', json_build_object(
            'id', v_user_id,
            'email', p_email,
            'first_name', p_first_name,
            'last_name', p_last_name,
            'role', p_role
        )
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Email already exists'
        );
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Failed to create user account: ' || SQLERRM
        );
END;
$$;

COMMENT ON FUNCTION create_user_account IS 'Creates a new user account with updated role system (admin, developer, instructor, scholar, student, guest)';

-- ============================================
-- STEP 5: VERIFICATION
-- ============================================

-- Verify policies are updated
DO $$
DECLARE
    old_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_policy_count
    FROM pg_policies
    WHERE definition LIKE '%trainee%' 
       OR definition LIKE '%tesda_scholar%';
    
    IF old_policy_count > 0 THEN
        RAISE WARNING 'Still found % policies with old role references - manual review needed', old_policy_count;
    ELSE
        RAISE NOTICE 'All policies updated successfully';
    END IF;
END $$;

-- ============================================
-- NOTES
-- ============================================

-- This script updates RLS policies and functions
-- Manual review may be needed for complex policies
-- Run this AFTER updating the enum (102_role_migration_update_enum.sql)
-- Test thoroughly after running this migration
