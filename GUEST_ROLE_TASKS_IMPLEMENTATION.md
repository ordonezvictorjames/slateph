# Guest Role Tasks Implementation

## Summary
Added functionality for Admin and Developer users to manage Guest users by assigning them proper roles.

## Changes Made

### 1. TasksPage Component (`src/components/pages/TasksPage.tsx`)

#### New Features:
- Added "Guest Users" tab to the Tasks page
- Displays all users with "guest" role in a dedicated table
- Added "Assign Role" action button for each guest user
- Created role assignment modal with dropdown to select role (Admin, Instructor, Student, Scholar)
- Added notification system to inform users when their role is changed
- Included warning that guest users cannot be reverted back to guest status

#### Technical Changes:
- Added `GuestUser` interface
- Added `guestUsers` state array
- Added `selectedGuest` and `selectedRole` states for modal
- Added `showRoleChangeModal` state
- Updated `selectedTab` type to include 'guests'
- Added `handleChangeGuestRole()` function to update user roles
- Fetches guest users in `fetchTasks()` function
- Updated "All Tasks" count to include guest users
- Added guest users rows to "All Tasks" table

### 2. DashboardHome Component (`src/components/pages/DashboardHome.tsx`)

#### New Features:
- Added "Guest Users" card to the Tasks Card section on dashboard
- Shows count of users with guest role
- Clicking the card navigates to Tasks page
- Only visible to Admin and Developer users

#### Technical Changes:
- Updated `pendingTasks` state to include `guestUsers: number`
- Added guest users count fetch in dashboard data loading
- Updated empty state check to include guest users
- Added Guest Users card with indigo color scheme

## User Flow

### For Admin/Developer:
1. View dashboard - see "Guest Users" card if there are any guest users
2. Click on card or navigate to Tasks page
3. Click "Guest Users" tab to see all guest users
4. Click "Assign Role" button next to a guest user
5. Select role from dropdown (Admin, Instructor, Student, Scholar)
6. Confirm assignment
7. User's role is updated and they receive a notification
8. Guest user disappears from the list (cannot be reverted to guest)

### For Guest Users:
1. Sign up creates account with "guest" role by default
2. Limited access until admin/developer assigns proper role
3. Receive notification when role is assigned
4. Gain full access based on assigned role

## Database Requirements

### Already Completed:
- ✅ `user_role` enum includes 'guest' value
- ✅ `create_user_account` function defaults to 'guest' role
- ✅ Profiles table supports guest role

### No Additional Changes Needed:
- Guest users are stored in existing `profiles` table
- Role changes use existing update mechanism
- Notifications use existing `notifications` table

## UI/UX Details

### Colors:
- Guest Users card: Indigo (bg-indigo-100, text-indigo-600, border-indigo-200)
- Consistent with existing color scheme for other task types

### Icons:
- User with plus icon for Guest Users card
- Matches the user management theme

### Modal:
- Clean, simple role selection dropdown
- Warning message about one-way role assignment
- Cancel and Assign buttons with proper disabled states

## Testing Checklist

- [ ] Create a new account (should be Guest by default)
- [ ] Login as Admin/Developer
- [ ] Verify Guest Users card appears on dashboard
- [ ] Navigate to Tasks page
- [ ] Verify Guest Users tab shows the new user
- [ ] Click "Assign Role" button
- [ ] Select a role and confirm
- [ ] Verify user role is updated in database
- [ ] Verify user receives notification
- [ ] Verify guest user no longer appears in Guest Users list
- [ ] Verify user can access features based on new role

## Files Modified

1. `src/components/pages/TasksPage.tsx` - Added guest user management
2. `src/components/pages/DashboardHome.tsx` - Added guest users card to dashboard

## Notes

- Guest role is one-way: once assigned a different role, users cannot be reverted to guest
- Only Admin and Developer can assign roles to guest users
- Guest users are automatically created during signup (default role)
- The implementation follows existing patterns for other task types (unenrolled students, unassigned instructors, etc.)
