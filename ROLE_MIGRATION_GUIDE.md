# Role Migration Guide: Trainee → Student, Remove Scholar

## Overview
This guide documents the migration from the old role system to the new simplified system.

## Role Changes

### Old Roles
1. admin
2. instructor
3. trainee
4. tesda_scholar  
5. developer

### New Roles
1. admin
2. developer
3. instructor
4. student

## Files Updated So Far

### ✅ Completed
- `src/types/index.ts` - Updated Profile and AuthUser role types
- `src/utils/roleUtils.tsx` - Updated UserRole type, colors, and labels
- `src/components/LoginForm.tsx` - New signups now create 'student' role
- `src/components/UserModals.tsx` - Updated role dropdown and NewUser interface

## Database Migration Required

### Step 1: Backup Current Data
```sql
-- Backup profiles table
CREATE TABLE profiles_backup AS SELECT * FROM profiles;

-- Check current role distribution
SELECT role, COUNT(*) FROM profiles GROUP BY role;
```

### Step 2: Migrate Existing Users
```sql
-- Update all trainee users to student
UPDATE profiles 
SET role = 'student' 
WHERE role = 'trainee';

-- Update all tesda_scholar users to student
UPDATE profiles 
SET role = 'student' 
WHERE role = 'tesda_scholar';

-- Verify migration
SELECT role, COUNT(*) FROM profiles GROUP BY role;
```

### Step 3: Update Enum Type
```sql
-- This requires careful handling in PostgreSQL
-- Option A: If no other tables reference this enum directly
ALTER TYPE user_role RENAME TO user_role_old;
CREATE TYPE user_role AS ENUM ('admin', 'developer', 'instructor', 'student');

ALTER TABLE profiles 
  ALTER COLUMN role TYPE user_role 
  USING role::text::user_role;

DROP TYPE user_role_old;

-- Option B: If other tables reference the enum
-- You may need to drop and recreate constraints/policies first
```

### Step 4: Update RLS Policies
```sql
-- Find all policies that reference trainee or tesda_scholar
SELECT schemaname, tablename, policyname, definition
FROM pg_policies
WHERE definition LIKE '%trainee%' OR definition LIKE '%tesda_scholar%';

-- Update each policy to use 'student' instead
-- Example:
DROP POLICY IF EXISTS "trainee_view_own_profile" ON profiles;
CREATE POLICY "student_view_own_profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id AND role = 'student');
```

### Step 5: Update Functions
```sql
-- Find functions that reference old roles
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%trainee%' 
   OR routine_definition LIKE '%tesda_scholar%';

-- Update create_user_account function
-- Update authenticate_user function  
-- Update any other custom functions
```

## Remaining Code Updates Needed

### High Priority
1. **Sidebar.tsx** - Remove tesda_scholar menu sections
2. **UserManagementPage.tsx** - Update role filters and types
3. **CourseManagementPage.tsx** - Update enrollment_type logic
4. **DashboardHome.tsx** - Update user stats (remove scholars count)
5. **MyCoursesPage.tsx** - Update role checks from trainee/tesda_scholar to student

### Medium Priority
6. **SchedulePage.tsx** - Update role checks
7. **MyStudentsPage.tsx** - Update references
8. **CoursesPage.tsx** - Update enrollment filters
9. **LibraryPage.tsx** - Update access controls

### Low Priority (Documentation)
10. Update all .md files in root directory
11. Update comments in code
12. Update any user-facing help text

## Testing Checklist

### Before Migration
- [ ] Backup database
- [ ] Document current user counts by role
- [ ] Test current functionality

### After Code Updates
- [ ] TypeScript compiles without errors
- [ ] No references to 'trainee' or 'tesda_scholar' in code
- [ ] All role dropdowns show correct options
- [ ] Sidebar shows correct menus for each role

### After Database Migration
- [ ] All users migrated successfully
- [ ] User counts match pre-migration totals
- [ ] Login works for all roles
- [ ] Role-based access control works correctly
- [ ] Course enrollment works
- [ ] Dashboard stats display correctly

### Production Deployment
- [ ] Run migration during low-traffic period
- [ ] Monitor error logs
- [ ] Verify user sessions still work
- [ ] Test critical user flows

## Rollback Plan

If issues occur:

```sql
-- Restore from backup
DROP TABLE profiles;
ALTER TABLE profiles_backup RENAME TO profiles;

-- Or restore specific users
UPDATE profiles 
SET role = 'trainee' 
WHERE id IN (SELECT id FROM profiles_backup WHERE role = 'trainee');
```

## Notes

- The 'student' role combines both old 'trainee' and 'tesda_scholar' roles
- All students now have the same permissions and access
- Enrollment type logic in courses may need review
- Consider if any reporting/analytics depend on the old role distinction

## Next Steps

1. Complete remaining code updates
2. Test thoroughly in local environment
3. Create database migration script
4. Test migration on staging database
5. Schedule production migration
6. Deploy code changes
7. Run database migration
8. Verify and monitor

