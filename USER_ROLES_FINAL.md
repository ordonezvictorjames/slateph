# User Roles and Permissions

## 4 User Roles

### 1. Admin
**Permissions:**
- ✅ Add, edit, delete, view: courses, subjects, modules, schedules
- ✅ Add, edit, delete, view: all user types EXCEPT developer
- ✅ View all trainees and instructors
- ❌ Cannot manage developer accounts

### 2. Instructor
**Permissions:**
- ✅ View trainees at "My Students" page
- ✅ Access assigned courses at "My Courses" page
- ✅ View courses table at "Courses" page
- ❌ Cannot add/edit/delete courses, subjects, modules
- ❌ Cannot manage users

### 3. Trainee
**Permissions:**
- ✅ Access enrolled courses only at "My Courses" page
- ✅ View courses table at "Courses" page
- ❌ Cannot manage anything
- ❌ Can only view their own data

### 4. Developer
**Permissions:**
- ✅ **FULL ACCESS** to all functions
- ✅ Can manage all user types including other developers
- ✅ Can manage all courses, subjects, modules, schedules
- ✅ System-level access

## Database Migration

Run these SQL files in order:

1. **1_drop_all_policies.sql** - Drops all RLS policies
2. **2_migrate_enum.sql** - Migrates to 4 roles: admin, instructor, trainee, developer
3. **3_recreate_policies.sql** - Recreates policies based on user flow

## Role Mapping from Old Schema

- `peer_lead` → `instructor`
- `participant` → `trainee`
- `student` → `trainee`
- `teacher` → `instructor`
- `tesda_scholar` → `trainee`
- `admin` → `admin` (unchanged)
- `developer` → `developer` (unchanged)

## TypeScript Types

Updated in `src/types/index.ts`:
```typescript
role: 'admin' | 'instructor' | 'trainee' | 'developer'
```

## Navigation/Sidebar Structure

### Admin & Developer
- Dashboard
- Courses (full management)
- Course Management
- Schedule
- User Management
- System Tracker
- Code Generator (developer only)
- Feature Requests

### Instructor
- Dashboard
- Courses (view only)
- My Courses (assigned courses)
- My Students (view trainees)
- Schedule (view only)
- Feature Requests

### Trainee
- Dashboard
- Courses (view only)
- My Courses (enrolled courses)
- Schedule (view only)
- Profile
- Settings

