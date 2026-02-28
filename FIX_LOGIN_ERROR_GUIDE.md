# Fix Login Error: "Account not properly configured"

## Problem
Users are getting the error "Account not properly configured. Please contact administrator" when trying to log in.

## Root Causes
1. User accounts exist but don't have passwords set in the database
2. The `create_user_account` function doesn't accept `tesda_scholar` role
3. Some users may have been created without proper password hashing

## Solution Steps

### Step 1: Run the Migration to Fix User Roles
Run this migration in your Supabase SQL Editor:

```bash
# File: supabase/migrations/067_fix_user_roles_and_create_function.sql
```

This migration will:
- Add `tesda_scholar` to the `user_role` enum if it doesn't exist
- Update the `create_user_account` function to accept all valid roles (admin, instructor, trainee, tesda_scholar, developer)
- Ensure passwords are properly hashed and users are set to 'active' status

### Step 2: Check for Users Without Passwords
Run this query in Supabase SQL Editor:

```sql
-- File: 64_check_and_fix_user_passwords.sql

SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  CASE 
    WHEN password IS NULL THEN 'NO PASSWORD SET'
    ELSE 'PASSWORD EXISTS'
  END as password_status
FROM profiles
WHERE password IS NULL
ORDER BY created_at DESC;
```

### Step 3: Fix Users Without Passwords

#### Option A: Set Default Password for All Users Without Passwords
```sql
UPDATE profiles
SET password = crypt('Slate2026!', gen_salt('bf'))
WHERE password IS NULL;
```

#### Option B: Set Password for Specific User
```sql
UPDATE profiles
SET password = crypt('YourPassword123!', gen_salt('bf'))
WHERE email = 'user@example.com' AND password IS NULL;
```

### Step 4: Verify the Fix
```sql
-- Check that all users now have passwords
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  CASE 
    WHEN password IS NULL THEN 'NO PASSWORD SET'
    ELSE 'PASSWORD EXISTS'
  END as password_status
FROM profiles
ORDER BY created_at DESC;
```

### Step 5: Ensure Users Are Active
```sql
-- Set all users to active status if they're not already
UPDATE profiles
SET status = 'active'
WHERE status != 'active' AND password IS NOT NULL;
```

## Testing

After running the fixes:

1. Try logging in with the affected user account
2. Use the default password: `Slate2026!` (if you used Option A)
3. The user should be able to log in successfully
4. Advise users to change their password after first login

## Prevention

To prevent this issue in the future:

1. Always use the `create_user_account` RPC function when creating users
2. Ensure the default password `Slate2026!` is always set for new users
3. The UserManagementPage already does this correctly

## Quick Fix Command

If you want to fix everything at once, run these commands in order in Supabase SQL Editor:

```sql
-- 1. Add tesda_scholar role (if needed)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'tesda_scholar' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
    ) THEN
        ALTER TYPE user_role ADD VALUE 'tesda_scholar';
    END IF;
END $$;

-- 2. Fix all users without passwords
UPDATE profiles
SET password = crypt('Slate2026!', gen_salt('bf'))
WHERE password IS NULL;

-- 3. Activate all users with passwords
UPDATE profiles
SET status = 'active'
WHERE password IS NOT NULL;

-- 4. Verify
SELECT 
  email,
  role,
  status,
  CASE WHEN password IS NULL THEN 'NO PASSWORD' ELSE 'HAS PASSWORD' END as pwd_status
FROM profiles
ORDER BY created_at DESC;
```

## Default Credentials

After fixing, users can log in with:
- Email: Their registered email
- Password: `Slate2026!`

They should change this password after first login through the Settings page.
