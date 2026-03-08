-- COMPLETE FIX: Run this in Supabase SQL Editor
-- Handles all enum types and updates

-- Step 1: Add values to user_role enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'student';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scholar' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'scholar';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'guest' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'guest';
    END IF;
END $$;

-- Step 2: Add values to enrollment_type enum (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_type') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = 'enrollment_type'::regtype) THEN
            ALTER TYPE enrollment_type ADD VALUE 'student';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scholar' AND enumtypid = 'enrollment_type'::regtype) THEN
            ALTER TYPE enrollment_type ADD VALUE 'scholar';
        END IF;
    END IF;
END $$;

-- Step 3: Update user roles
UPDATE profiles SET role = 'student' WHERE role = 'trainee';
UPDATE profiles SET role = 'scholar' WHERE role = 'tesda_scholar';

-- Step 4: Update enrollment types (if columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'enrollment_type') THEN
        UPDATE courses SET enrollment_type = 'student' WHERE enrollment_type = 'trainee';
        UPDATE courses SET enrollment_type = 'scholar' WHERE enrollment_type = 'tesda_scholar';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'enrollment_type') THEN
        UPDATE subjects SET enrollment_type = 'student' WHERE enrollment_type = 'trainee';
        UPDATE subjects SET enrollment_type = 'scholar' WHERE enrollment_type = 'tesda_scholar';
    END IF;
END $$;

-- Step 5: Update create_user_account function
CREATE OR REPLACE FUNCTION create_user_account(
    p_email TEXT, p_first_name TEXT, p_last_name TEXT, p_password TEXT, p_role TEXT DEFAULT 'guest'
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_id UUID; v_password_hash TEXT; v_role user_role;
BEGIN
    CASE p_role
        WHEN 'trainee' THEN v_role := 'student'::user_role;
        WHEN 'tesda_scholar' THEN v_role := 'scholar'::user_role;
        ELSE v_role := p_role::user_role;
    END CASE;
    v_user_id := gen_random_uuid();
    v_password_hash := crypt(p_password, gen_salt('bf'));
    INSERT INTO profiles (id, email, first_name, last_name, role, password_hash, status, created_at, updated_at)
    VALUES (v_user_id, p_email, p_first_name, p_last_name, v_role, v_password_hash, 'active', NOW(), NOW());
    RETURN json_build_object('success', true, 'message', 'User created', 'user', json_build_object('id', v_user_id, 'email', p_email, 'first_name', p_first_name, 'last_name', p_last_name, 'role', v_role));
EXCEPTION
    WHEN unique_violation THEN RETURN json_build_object('success', false, 'message', 'Email exists');
    WHEN OTHERS THEN RETURN json_build_object('success', false, 'message', SQLERRM);
END; $$;

SELECT 'Migration complete! Signup should now work.' as status;
