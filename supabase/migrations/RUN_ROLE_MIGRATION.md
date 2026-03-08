# Role Migration - Execution Guide

## Overview
This guide walks you through migrating the user role system from old roles (trainee, tesda_scholar) to new roles (student, scholar, guest).

## Migration Scripts

The migration is split into 4 scripts that must be run in order:

1. **100_role_migration_backup.sql** - Creates backup tables
2. **101_role_migration_update_data.sql** - Updates user role data
3. **102_role_migration_update_enum.sql** - Updates enum type
4. **103_role_migration_update_policies.sql** - Updates RLS policies and functions
5. **104_role_migration_verification.sql** - Verifies migration success

## Prerequisites

- [ ] Database backup completed
- [ ] Application is in maintenance mode (optional but recommended)
- [ ] All users are logged out (optional but recommended)
- [ ] You have database admin access
- [ ] You have tested on a staging environment first

## Execution Steps

### Step 1: Create Backups (CRITICAL)

```bash
# Connect to your Supabase database
psql -h your-db-host -U postgres -d your-database

# Or use Supabase SQL Editor
```

Run the backup script:
```sql
\i supabase/migrations/100_role_migration_backup.sql
```

**Expected Output:**
```
NOTICE: Current role distribution: admin: X, developer: Y, instructor: Z, trainee: A, tesda_scholar: B
NOTICE: Backup successful: N records backed up
```

**Verify:**
```sql
SELECT COUNT(*) FROM profiles_backup_20260308;
SELECT COUNT(*) FROM profiles;
-- Both should return the same number
```

### Step 2: Update User Data

Run the data migration script:
```sql
\i supabase/migrations/101_role_migration_update_data.sql
```

**Expected Output:**
```
NOTICE: Migration complete. Total users: N
NOTICE: New role distribution: admin: X, developer: Y, instructor: Z, student: A, scholar: B
NOTICE: Verification passed: No old roles found
```

**Verify:**
```sql
-- Should return 0
SELECT COUNT(*) FROM profiles WHERE role IN ('trainee', 'tesda_scholar');

-- Should show new roles
SELECT role, COUNT(*) FROM profiles GROUP BY role;
```

### Step 3: Update Enum Type

Run the enum update script:
```sql
\i supabase/migrations/102_role_migration_update_enum.sql
```

**Expected Output:**
```
NOTICE: Added student to user_role enum
NOTICE: Added scholar to user_role enum
NOTICE: Added guest to user_role enum
NOTICE: Current user_role enum values: admin, developer, guest, instructor, scholar, student, ...
```

**Verify:**
```sql
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype 
ORDER BY enumsortorder;
```

### Step 4: Update Policies and Functions

Run the policies update script:
```sql
\i supabase/migrations/103_role_migration_update_policies.sql
```

**Expected Output:**
```
NOTICE: No policies found referencing old roles
-- OR --
NOTICE: Found X policies referencing old roles
NOTICE: Updated trainee policy to student policy
NOTICE: All policies updated successfully
```

**Verify:**
```sql
-- Check for policies with old role references
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE definition LIKE '%trainee%' 
   OR definition LIKE '%tesda_scholar%';
-- Should return 0 rows or only legacy policies
```

### Step 5: Verification

Run the verification script:
```sql
\i supabase/migrations/104_role_migration_verification.sql
```

**Expected Output:**
```
NOTICE: PASSED: No users with old roles found
NOTICE: Current role distribution: admin: X, developer: Y, instructor: Z, student: A, scholar: B, guest: C
NOTICE: PASSED: All new enum values exist
NOTICE: PASSED: User count matches (backup: N, current: N)
NOTICE: PASSED: No courses with old enrollment types
NOTICE: [Migration Summary]
```

**All checks should show PASSED**

## Post-Migration Testing

### Test Checklist

1. **Login Tests**
   - [ ] Admin can log in
   - [ ] Developer can log in
   - [ ] Instructor can log in
   - [ ] Student can log in (formerly trainee)
   - [ ] Scholar can log in (formerly tesda_scholar)

2. **Sidebar Tests**
   - [ ] Admin sees correct menu items
   - [ ] Developer sees correct menu items
   - [ ] Instructor sees correct menu items
   - [ ] Student sees correct menu items
   - [ ] Scholar sees correct menu items

3. **Functionality Tests**
   - [ ] User management shows correct roles
   - [ ] Role badges display correctly
   - [ ] Course enrollment works
   - [ ] Dashboard displays correctly
   - [ ] Permissions work as expected

4. **New User Creation**
   - [ ] New signup creates Guest role
   - [ ] Admin can change Guest to Student
   - [ ] Admin can change Guest to Scholar
   - [ ] Cannot revert to Guest after promotion

## Rollback Procedure

If something goes wrong, you can rollback:

```sql
-- Stop the application first!

-- Restore profiles table
DROP TABLE profiles;
ALTER TABLE profiles_backup_20260308 RENAME TO profiles;

-- Restore enrollments if needed
DROP TABLE enrollments;
ALTER TABLE enrollments_backup_20260308 RENAME TO enrollments;

-- Restart application
```

## Cleanup (After 30 Days)

Once you're confident the migration is successful:

```sql
-- Wait at least 30 days before running this!
DROP TABLE IF EXISTS profiles_backup_20260308;
DROP TABLE IF EXISTS enrollments_backup_20260308;
```

## Troubleshooting

### Issue: "No old roles found" but sidebar still empty

**Solution:** Clear application cache and restart dev server
```bash
rm -rf .next
npm run dev
```

### Issue: Enum update fails

**Solution:** Check if values already exist
```sql
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype;
```

### Issue: Policy update fails

**Solution:** Manually review and update policies
```sql
-- List all policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Issue: Function update fails

**Solution:** Check function definition
```sql
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'create_user_account';
```

## Support

If you encounter issues:
1. Check the verification output for specific failures
2. Review the backup tables to ensure data is safe
3. Test on staging environment first
4. Contact support with specific error messages

## Migration Checklist

- [ ] Backups created successfully
- [ ] User data updated (trainee → student, tesda_scholar → scholar)
- [ ] Enum type updated (added student, scholar, guest)
- [ ] Policies updated
- [ ] Functions updated
- [ ] All verification checks passed
- [ ] Application tested with all roles
- [ ] Users can log in successfully
- [ ] Sidebar displays correctly
- [ ] No errors in application logs
- [ ] Backup tables retained for 30 days

## Timeline

- **Preparation:** 30 minutes
- **Execution:** 15 minutes
- **Testing:** 1 hour
- **Monitoring:** 24 hours
- **Cleanup:** After 30 days

## Notes

- Run during low-traffic period
- Keep application in maintenance mode during migration
- Monitor error logs closely after migration
- Keep backups for at least 30 days
- Document any custom changes made

---

**Migration Date:** _______________
**Executed By:** _______________
**Status:** _______________
**Notes:** _______________
