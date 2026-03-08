# Guest Role Implementation

## Overview
The Guest role is a special user type designed for new account registrations that require approval before gaining full system access.

## Role Hierarchy

```
Developer (Highest - Full system access)
    ↓
  Admin (Full management access)
    ↓
Instructor (Course management)
    ↓
Scholar / Student (Learners with full access)
    ↓
  Guest (Pending approval - Limited access)
```

## Guest Role Characteristics

### Purpose
- Default role for all new signups
- Requires admin approval before accessing system features
- Prevents unauthorized access to courses and content
- Allows administrators to review and approve new users

### Access & Permissions
- ✅ Can log in to the system
- ✅ Can view their own profile
- ❌ Cannot access courses
- ❌ Cannot enroll in courses
- ❌ Cannot access library
- ❌ Cannot view schedule
- ❌ Limited dashboard access

### One-Way Role Change
**Critical Rule**: Once a Guest is promoted to another role, they CANNOT be reverted back to Guest.

**Allowed Transitions**:
```
Guest → Student   ✅
Guest → Scholar   ✅
Guest → Instructor ✅
Guest → Admin     ✅
Guest → Developer ✅

Student → Guest   ❌ (Not allowed)
Scholar → Guest   ❌ (Not allowed)
Any Role → Guest  ❌ (Not allowed)
```

### Implementation Details

#### 1. New Account Creation
```typescript
// LoginForm.tsx
const role = 'guest' // Default for all new signups
```

#### 2. Role Dropdown Logic
```typescript
// UserModals.tsx
{user.role === 'guest' && <option value="guest">Guest (Pending Approval)</option>}
// Guest option only shows if current role is already guest
```

#### 3. Type Definitions
```typescript
// types/index.ts
role: 'admin' | 'developer' | 'guest' | 'instructor' | 'scholar' | 'student'
```

#### 4. Role Display
- **Badge Color**: Gray (`bg-gray-100 text-gray-800`)
- **Label**: "Guest"

## User Workflow

### For New Users
1. User signs up on the website
2. Account created with "Guest" role
3. User can log in but has limited access
4. User sees message: "Your account is pending approval"
5. User waits for admin to approve

### For Administrators
1. Admin sees new Guest accounts in User Management
2. Admin reviews user information
3. Admin changes role from Guest to appropriate role:
   - Student (regular learner)
   - Scholar (scholarship recipient)
   - Instructor (teacher)
   - Admin (manager)
4. User now has full access based on assigned role

## Benefits

### Security
- Prevents unauthorized access to educational content
- Allows vetting of new users before granting access
- Reduces spam and fake accounts

### Administrative Control
- Admins can review all new signups
- Can verify user information before approval
- Can assign appropriate role based on user type

### User Experience
- Clear indication of pending status
- Users know they need to wait for approval
- Prevents confusion about why they can't access content

## Database Considerations

### Migration
When implementing, existing users should NOT be affected:
```sql
-- Only new signups get 'guest' role
-- Existing users keep their current roles
-- No automatic migration needed
```

### Enum Update
```sql
ALTER TYPE user_role ADD VALUE 'guest';
-- Add guest to the enum type
```

## UI/UX Considerations

### Guest User Dashboard
Should display:
- Welcome message
- "Account Pending Approval" notice
- Contact information for support
- Estimated approval time
- Limited navigation menu

### Admin User Management
Should highlight:
- Number of pending Guest accounts
- Filter to show only Guests
- Bulk approval option (future enhancement)
- Notification when new Guest signs up

## Future Enhancements

### Possible Additions
1. **Email Notifications**
   - Notify admins when new Guest signs up
   - Notify user when approved

2. **Approval Workflow**
   - Add approval button in user management
   - Add rejection option with reason
   - Add approval notes/comments

3. **Auto-Approval**
   - Option to auto-approve based on email domain
   - Example: @school.edu automatically becomes Student

4. **Guest Expiration**
   - Auto-delete Guest accounts after X days if not approved
   - Send reminder to admins about pending Guests

## Testing Checklist

- [ ] New signup creates Guest role
- [ ] Guest can log in
- [ ] Guest has limited access
- [ ] Admin can see Guest users
- [ ] Admin can change Guest to Student
- [ ] Admin can change Guest to Scholar
- [ ] Admin can change Guest to Instructor
- [ ] Admin can change Guest to Admin
- [ ] Guest option disappears after role change
- [ ] Cannot revert any role back to Guest
- [ ] Guest badge displays correctly
- [ ] TypeScript compiles without errors

## Code Files Modified

1. `src/types/index.ts` - Added 'guest' to role types
2. `src/utils/roleUtils.tsx` - Added Guest color and label
3. `src/components/LoginForm.tsx` - Changed default role to 'guest'
4. `src/components/UserModals.tsx` - Added conditional Guest option logic

## Notes

- Guest role is intentionally restrictive
- Designed to protect educational content
- Balances security with user onboarding
- Requires minimal code changes to implement
- Can be enhanced with additional features later

---

**Implementation Date**: 2026-03-08
**Status**: Implemented
**Version**: 1.0
