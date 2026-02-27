# Schema Update: Trainee Role

## Changes Made

Updated the application schema to simplify user roles:

### Removed Roles
- ❌ `peer_lead` (formerly instructor/teacher role)
- ❌ `participant` (formerly student role)  
- ❌ `teacher`

### Added Role
- ✅ `trainee` - Single role for all learners/trainees in the system

## Current Role Structure

The application now supports **3 roles**:

1. **admin** - Full system access and management
2. **trainee** - Learners/trainees in the program
3. **developer** - System development and technical access

## Files Updated

All TypeScript files in the `src/` directory have been updated to use the new role structure:

- `src/types/index.ts` - Core type definitions
- `src/components/Dashboard.tsx` - Dashboard routing
- `src/components/Sidebar.tsx` - Navigation menu
- All page components
- All modal components
- Authentication context

## Database Schema

Your Supabase database should be updated to match:

```sql
-- Step 1: Remove the default value temporarily
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- Step 2: Rename the old enum type
ALTER TYPE user_role RENAME TO user_role_old;

-- Step 3: Create the new enum type
CREATE TYPE user_role AS ENUM ('admin', 'trainee', 'developer');

-- Step 4: Update the column to use the new type
ALTER TABLE profiles 
  ALTER COLUMN role TYPE user_role 
  USING 
    CASE 
      WHEN role::text = 'peer_lead' THEN 'trainee'::user_role
      WHEN role::text = 'participant' THEN 'trainee'::user_role
      WHEN role::text = 'student' THEN 'trainee'::user_role
      WHEN role::text = 'instructor' THEN 'trainee'::user_role
      WHEN role::text = 'teacher' THEN 'trainee'::user_role
      WHEN role::text = 'admin' THEN 'admin'::user_role
      WHEN role::text = 'developer' THEN 'developer'::user_role
      ELSE 'trainee'::user_role
    END;

-- Step 5: Set the new default value
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'trainee'::user_role;

-- Step 6: Drop the old enum type
DROP TYPE user_role_old;

-- Step 7: Update the constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['admin'::user_role, 'trainee'::user_role, 'developer'::user_role]));
```

## Migration Notes

- Default role is now `trainee` (was `participant`)
- All references to `peer_lead`, `participant`, and `teacher` have been replaced with `trainee`
- The application is backward compatible - existing users will need their roles updated in the database

## Next Steps

1. Run the SQL migration in your Supabase database
2. Update existing user roles in the database
3. Test the application with different role types
4. Update any external documentation

---

**Date:** February 27, 2026
**Status:** ✅ Complete
