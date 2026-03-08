# CRITICAL: Run These SQL Commands ONE AT A TIME

Copy and paste each block below into Supabase SQL Editor. Wait for SUCCESS before moving to the next one.

---

## STEP 1: Add new enum values to user_role
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'scholar';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'guest';
```
**Expected**: Success (or "value already exists" - that's OK)

---

## STEP 2: Check if enrollment_type enum exists
```sql
SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_type') as has_enrollment_type;
```
**Expected**: Returns true or false

---

## STEP 3A: If Step 2 returned TRUE, run this:
```sql
ALTER TYPE enrollment_type ADD VALUE IF NOT EXISTS 'student';
ALTER TYPE enrollment_type ADD VALUE IF NOT EXISTS 'scholar';
```
**Expected**: Success

## STEP 3B: If Step 2 returned FALSE, skip to Step 4

---

## STEP 4: Update user roles in profiles table
```sql
UPDATE profiles SET role = 'student' WHERE role = 'trainee';
UPDATE profiles SET role = 'scholar' WHERE role = 'tesda_scholar';

SELECT role, COUNT(*) FROM profiles GROUP BY role;
```
**Expected**: Shows count of users by role

---

## STEP 5: Update courses table (if enrollment_type column exists)
```sql
UPDATE courses 
SET enrollment_type = 'student' 
WHERE enrollment_type = 'trainee';

UPDATE courses 
SET enrollment_type = 'scholar' 
WHERE enrollment_type = 'tesda_scholar';
```
**Expected**: Success (or "column does not exist" - that's OK, skip to Step 6)

---

## STEP 6: Update subjects table (if enrollment_type column exists)
```sql
UPDATE subjects 
SET enrollment_type = 'student' 
WHERE enrollment_type = 'trainee';

UPDATE subjects 
SET enrollment_type = 'scholar' 
WHERE enrollment_type = 'tesda_scholar';
```
**Expected**: Success (or "column does not exist" - that's OK, continue)

---

## STEP 7: Update the create_user_account function
```sql
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
    -- Map old roles to new roles and validate
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
                'message', 'Invalid role. Must be admin, developer, instructor, scholar, student, or guest'
            );
    END CASE;

    v_user_id := gen_random_uuid();
    v_password_hash := crypt(p_password, gen_salt('bf'));
    
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
```
**Expected**: "CREATE FUNCTION" success message

---

## STEP 8: Verify everything works
```sql
-- Check enum values
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype 
ORDER BY enumsortorder;

-- Check user counts
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role;
```
**Expected**: Should show all 6 roles (admin, developer, instructor, scholar, student, guest)

---

## DONE! Now test signup:
1. Go to your app signup page
2. Create a new account
3. It should create a Guest user successfully

---

## Why This Works:
- Each ALTER TYPE command commits immediately
- No DO blocks that cause enum commit issues
- Simple UPDATE statements that work after enums are added
- Function update happens last after all data is migrated
