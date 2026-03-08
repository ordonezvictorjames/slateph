-- Migration: Fix create_user_account function to accept new roles
-- Description: Update function to accept guest, student, scholar roles
-- Date: 2026-03-08
-- Priority: URGENT - Run this immediately to fix signup

-- ============================================
-- UPDATE create_user_account FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION create_user_account(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'guest'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_password_hash TEXT;
    v_result JSON;
    v_role user_role;
BEGIN
    -- Convert text role to enum, with validation
    BEGIN
        v_role := p_role::user_role;
    EXCEPTION
        WHEN invalid_text_representation THEN
            RETURN json_build_object(
                'success', false,
                'message', 'Invalid role. Must be: admin, developer, instructor, scholar, student, or guest'
            );
    END;

    -- Validate role (accept both old and new values for compatibility)
    IF p_role NOT IN ('admin', 'developer', 'instructor', 'scholar', 'student', 'guest', 'trainee', 'tesda_scholar') THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid role. Must be: admin, developer, instructor, scholar, student, or guest'
        );
    END IF;

    -- Map old roles to new roles for backward compatibility
    IF p_role = 'trainee' THEN
        v_role := 'student'::user_role;
    ELSIF p_role = 'tesda_scholar' THEN
        v_role := 'scholar'::user_role;
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
        v_role,
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
            'role', v_role
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

COMMENT ON FUNCTION create_user_account IS 'Creates a new user account. Accepts roles: admin, developer, instructor, scholar, student, guest. Default role is guest for new signups.';

-- ============================================
-- VERIFICATION
-- ============================================

-- Test the function (optional - comment out if not needed)
DO $$
DECLARE
    test_result JSON;
BEGIN
    -- Test with guest role (should succeed)
    SELECT create_user_account(
        'test_guest@example.com',
        'Test',
        'Guest',
        'TestPassword123!',
        'guest'
    ) INTO test_result;
    
    IF (test_result->>'success')::boolean THEN
        RAISE NOTICE 'Function test PASSED: Guest role accepted';
        -- Clean up test user
        DELETE FROM profiles WHERE email = 'test_guest@example.com';
    ELSE
        RAISE WARNING 'Function test FAILED: %', test_result->>'message';
    END IF;
END $$;

-- ============================================
-- NOTES
-- ============================================

-- This function now accepts:
-- - New roles: admin, developer, instructor, scholar, student, guest
-- - Old roles (for compatibility): trainee → student, tesda_scholar → scholar
-- Default role is 'guest' for new signups
-- Run this immediately to fix signup errors
