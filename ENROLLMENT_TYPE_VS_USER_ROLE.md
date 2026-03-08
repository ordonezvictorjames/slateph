# Enrollment Type vs User Role - Important Distinction

## The Error

```
Error creating subject: new row for relation "subjects" violates check constraint "subjects_enrollment_type_check"
```

## Root Cause

There's confusion between TWO different concepts:

### 1. User Roles (for profiles table)
These define what type of user account someone has:
- `admin`
- `developer`
- `instructor`
- `scholar`
- `student` (was `trainee`)
- `guest`

### 2. Enrollment Types (for courses/subjects tables)
These define WHO CAN ENROLL in a course or subject:
- `trainee` - Only students can enroll
- `tesda_scholar` - Only scholars can enroll
- `both` - Both students and scholars can enroll

## The Problem

When we renamed the user role from `trainee` to `student`, the database constraint on the `subjects` table got updated incorrectly. The constraint should still allow `'trainee'` as an enrollment type because:

1. Enrollment types are NOT the same as user roles
2. `'trainee'` as an enrollment type means "students can enroll"
3. `'tesda_scholar'` as an enrollment type means "scholars can enroll"

## The Solution

Run `fix_subjects_constraint_final.sql` in Supabase SQL Editor to:

1. Drop the incorrect constraint
2. Recreate it with the correct enrollment type values: `'trainee'`, `'tesda_scholar'`, `'both'`

## Summary Table

| Concept | Location | Values | Purpose |
|---------|----------|--------|---------|
| **User Role** | `profiles.role` | admin, developer, instructor, scholar, student, guest | Defines user account type |
| **Enrollment Type** | `courses.enrollment_type`<br>`subjects.enrollment_type` | trainee, tesda_scholar, both | Defines who can enroll in course/subject |

## Key Points

- User roles changed: `trainee` → `student`
- Enrollment types stayed the same: `trainee`, `tesda_scholar`, `both`
- These are TWO DIFFERENT THINGS
- Don't confuse them!

## After Running the Fix

1. The constraint will allow `'trainee'`, `'tesda_scholar'`, `'both'` as enrollment types
2. You can create subjects with any of these enrollment types
3. The system will work correctly:
   - Subjects with `enrollment_type = 'trainee'` → Students can enroll
   - Subjects with `enrollment_type = 'tesda_scholar'` → Scholars can enroll
   - Subjects with `enrollment_type = 'both'` → Both can enroll
