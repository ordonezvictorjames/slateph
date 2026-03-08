-- QUICK FIX: Run ONLY this to fix signup error
-- No backups, no migrations, just the function fix

-- Step 1: Add new enum values if they don't exist
DO $$
BEGIN
    -- Add student
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'student';
    END IF;
    
    -- Add scholar
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scholar' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'scholar';
    END IF;
    
    -- Add guest
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'guest' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'guest';
    END IF;
    
    RAISE NOTICE 'Enum values added successfully';
END $$;

-- Step 2: Update the create_user_account function
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
    -- Map roles (supports both old and new)
    CASE p_role
        WHEN 'trainee' THEN v_role := 'student'::user_role;
        WHEN 'tesda_scholar' THEN v_role := 'scholar'::user_role;
        WHEN 'admin' THEN v_role := 'admin'::user_role;
        WHEN 'developer' THEN v_role := 'developer'::user_role;
        WHEN 'instructor' THEN v_role := 'instructor'::user_role;
        WHEN 'scholar' THEN v_role := 'scholar'::user_role;
        WHEN 'student' THEN v_role := 'student'::user_role;
        WHEN 'guest' THEN v_role := 'guest'::user_role;
        ELSE
            RETURN json_build_object(
                'success', false,
                'message', 'Invalid role'
            );
    END CASE;

    v_user_id := gen_random_uuid();
    v_password_hash := crypt(p_password, gen_salt('bf'));
    
    INSERT INTO profiles (
        id, email, first_name, last_name, role, password_hash, status, created_at, updated_at
    ) VALUES (
        v_user_id, p_email, p_first_name, p_last_name, v_role, v_password_hash, 'active', NOW(), NOW()
    );
    
    RETURN json_build_object(
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
    
EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'message', 'Email already exists');
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Failed: ' || SQLERRM);
END;
$$;

-- Done!
SELECT 'Signup function fixed! New users will be created as guest role.' as status;
