# Database Fix - Step by Step Guide

Run these SQL commands **ONE AT A TIME** in Supabase SQL Editor.
Wait for each to complete before running the next.

## Step 1: Add enum values to user_role

```sql
-- Add student
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'student';
        RAISE NOTICE 'Added student';
    END IF;
END $$;
```

## Step 2: Add scholar to user_role

```sql
-- Add scholar
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scholar' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'scholar';
        RAISE NOTICE 'Added scholar';
    END IF;
END $$;
```

## Step 3: Add guest to user_role

```sql
-- Add guest
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'guest' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'guest';
        RAISE NOTICE 'Added guest';
    END IF;
END $$;
```

## Step 4: Add student to enrollment_type (if exists)

```sql
-- Add student to enrollment_type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_type') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'student' AND enumtypid = 'enrollment_type'::regtype) THEN
            ALTER TYPE enrollment_type ADD VALUE 'student';
            RAISE NOTICE 'Added student to enrollment_type';
        END IF;
    END IF;
END $$;
```

## Step 5: Add scholar to enrollment_type (if exists)

```sql
-- Add scholar to enrollment_type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_type') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'scholar' AND enumtypid = 'enrollment_type'::regtype) THEN
            ALTER TYPE enrollment_type ADD VALUE 'scholar';
            RAISE NOTICE 'Added scholar to enrollment_type';
        END IF;
    END IF;
END $$;
```

## Step 6: Update user roles in profiles

```sql
-- Update user roles
UPDATE profiles SET role = 'student' WHERE role = 'trainee';
UPDATE profiles SET role = 'scholar' WHERE role = 'tesda_scholar';

SELECT 'Updated ' || COUNT(*) || ' users' as result FROM profiles WHERE role IN ('student', 'scholar');
```

## Step 7: Update enrollment types in courses

```sql
-- Update courses enrollment_type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'enrollment_type') THEN
        UPDATE courses SET enrollment_type = 'student' WHERE enrollment_type = 'trainee';
        UPDATE courses SET enrollment_type = 'scholar' WHERE enrollment_type = 'tesda_scholar';
        RAISE NOTICE 'Updated courses';
    END IF;
END $$;
```

## Step 8: Update enrollment types in subjects

```sql
-- Update subjects enrollment_type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'enrollment_type') THEN
        UPDATE subjects SET enrollment_type = 'student' WHERE enrollment_type = 'trainee';
        UPDATE subjects SET enrollment_type = 'scholar' WHERE enrollment_type = 'tesda_scholar';
        RAISE NOTICE 'Updated subjects';
    END IF;
END $$;
```

## Step 9: Update create_user_account function

```sql
-- Update signup function
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
    v_role user_role;
BEGIN
    -- Map old roles to new roles
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
            RETURN json_build_object('success', false, 'message', 'Invalid role');
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
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$;

SELECT 'Function updated successfully!' as result;
```

## Step 10: Verify everything

```sql
-- Verify the migration
SELECT 
    'user_role enum' as type,
    string_agg(enumlabel, ', ' ORDER BY enumsortorder) as values
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype

UNION ALL

SELECT 
    'Current user roles' as type,
    string_agg(role || ': ' || count::text, ', ') as values
FROM (
    SELECT role, COUNT(*) as count 
    FROM profiles 
    GROUP BY role
) stats;
```

---

## Why Step by Step?

PostgreSQL requires enum values to be committed in a separate transaction before they can be used. Running each step separately ensures each transaction commits before the next one starts.

## Expected Results

After all steps:
- ✅ New enum values added
- ✅ Existing users updated
- ✅ Courses/subjects updated
- ✅ Signup function fixed
- ✅ New signups create Guest accounts

## If You Get Errors

- **"value already exists"**: That's OK, skip to next step
- **"column does not exist"**: That's OK, the script handles it
- **Any other error**: Stop and share the error message
