# User Role Rename: Trainee → Student, Remove Scholar

## Changes Made

### Role Structure
**Before:**
- admin
- instructor  
- trainee
- tesda_scholar
- developer

**After:**
- admin
- developer
- instructor
- student

### Files Updated

#### Type Definitions
- ✅ `src/types/index.ts` - Updated Profile and AuthUser interfaces
- ✅ `src/utils/roleUtils.tsx` - Updated UserRole type, getRoleColor(), getRoleLabel()

### Remaining Files to Update

#### Components
- `src/components/UserModals.tsx` - Update role type and dropdown options
- `src/components/Sidebar.tsx` - Remove tesda_scholar sections, update trainee to student
- `src/components/pages/UserManagementPage.tsx` - Update role types
- `src/components/pages/CourseManagementPage.tsx` - Update enrollment_type logic
- `src/components/pages/DashboardHome.tsx` - Update stats (remove scholars, rename trainees)
- `src/components/pages/MyCoursesPage.tsx` - Update role checks
- `src/components/pages/SchedulePage.tsx` - Update role checks
- `src/components/LoginForm.tsx` - Update signup role assignment

#### Database
- Need to update Supabase enum: `user_role`
- Need to migrate existing data: `trainee` → `student`, remove `tesda_scholar`
- Update RLS policies if they reference specific roles

### Search and Replace Patterns

1. **Type definitions**: `'trainee'` → `'student'`
2. **Role checks**: `role === 'trainee'` → `role === 'student'`
3. **Role checks**: `role === 'tesda_scholar'` → remove or combine with student
4. **Combined checks**: `'trainee' | 'tesda_scholar'` → `'student'`
5. **Array checks**: `['trainee', 'tesda_scholar']` → `['student']`
6. **Labels**: `'Trainee'` → `'Student'`
7. **Labels**: `'Scholar'` / `'TESDA Scholar'` → remove
8. **Variables**: `totaltrainees` → `totalStudents`
9. **Variables**: `totalScholars` → remove

### Database Migration Required

```sql
-- Update enum type
ALTER TYPE user_role RENAME VALUE 'trainee' TO 'student';
-- Note: tesda_scholar will need to be migrated to student first, then removed

-- Migrate existing users
UPDATE profiles SET role = 'student' WHERE role IN ('trainee', 'tesda_scholar');

-- Update enrollments if needed
-- Check enrollment_type field usage
```

### Testing Checklist

After updates:
- [ ] All TypeScript files compile without errors
- [ ] Login/signup works with new role
- [ ] User management shows correct roles
- [ ] Dashboard stats show correct counts
- [ ] Sidebar shows correct menu items for students
- [ ] Course enrollment works for students
- [ ] No references to trainee or tesda_scholar remain

## Next Steps

1. Update all component files
2. Create database migration script
3. Test locally
4. Deploy to production
5. Verify all users migrated correctly
