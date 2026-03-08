# Debug: Sidebar Empty Issue

## Problem
Sidebar is empty for student and scholar users after role migration.

## Root Cause
The database still contains old role values ('trainee', 'tesda_scholar') but the code now expects new values ('student', 'scholar').

## How to Check Current User Role

1. Open browser console (F12)
2. Log in as a student/scholar
3. Check the user object in AuthContext

## Database Migration Required

The database needs to be updated to use the new role values:

```sql
-- Check current roles in database
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role;

-- Update old roles to new roles
UPDATE profiles 
SET role = 'student' 
WHERE role = 'trainee';

UPDATE profiles 
SET role = 'scholar' 
WHERE role = 'tesda_scholar';

-- Verify the update
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role;
```

## Expected Roles in Database

After migration, the database should only contain:
- `admin`
- `developer`
- `instructor`
- `scholar`
- `student`
- `guest`

## Temporary Workaround

Until database is migrated, you can add backward compatibility to the Sidebar:

```typescript
// In Sidebar.tsx, update the userRole line:
const userRole = user?.profile?.role || displayUser?.profile?.role || 'user'

// Add role mapping for backward compatibility
const normalizeRole = (role: string): string => {
  const roleMap: Record<string, string> = {
    'trainee': 'student',
    'tesda_scholar': 'scholar'
  }
  return roleMap[role] || role
}

const normalizedUserRole = normalizeRole(userRole)

// Then use normalizedUserRole in the filter:
const visibleMenuGroups = menuGroups
  .filter(group => group.roles.includes(normalizedUserRole))
  .map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.roles.includes(normalizedUserRole) && isSectionEnabled(item.id)
    )
  }))
  .filter(group => group.items.length > 0)
```

## Next Steps

1. Run the SQL migration to update existing user roles
2. Or implement the temporary workaround
3. Test with a student/scholar account
4. Verify sidebar appears with correct menu items

## Files to Check

- `src/components/Sidebar.tsx` - Menu filtering logic
- Database `profiles` table - User role values
- `src/contexts/AuthContext.tsx` - User role retrieval

