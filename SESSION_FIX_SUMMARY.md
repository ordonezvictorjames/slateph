# Session Logout Issue - Fixed

## Problem
Users were being logged out on every page refresh (F5) because:
1. The session API was returning `{ session: { userId, role, email } }` 
2. But AuthContext was looking for `data.session?.id`
3. The mismatch caused the session check to fail

## Solution Applied

### 1. Fixed Session API (`src/app/api/auth/session/route.ts`)
Changed the GET endpoint to return:
```javascript
{
  session: {
    id: sessionData.userId,  // Added 'id' field
    role: sessionData.role,
    email: sessionData.email
  }
}
```

### 2. Removed `bio` field from AuthContext
The `bio` field doesn't exist in the Profile type, causing TypeScript errors.

## How It Works Now

1. **Login**: User logs in → Session cookie created with userId, role, email
2. **Refresh**: Page refreshes → AuthContext calls `/api/auth/session`
3. **Session Check**: API returns session with `id` field → User stays logged in
4. **Cookie Duration**: 24 hours (configurable in SESSION_MAX_AGE)

## Testing

1. Log in to the application
2. Press F5 to refresh
3. User should remain logged in
4. Session persists for 24 hours

## Additional Issues Found

The global find/replace for roles created some issues:
- `MytraineesPage` should be `MyStudentsPage`
- Duplicate variable declarations in CourseManagementPage

## Recommended Next Steps

1. Restart the dev server (already done)
2. Test login and refresh functionality
3. Fix any remaining variable naming issues from the role migration
4. Run the database migration SQL files to update roles in Supabase

