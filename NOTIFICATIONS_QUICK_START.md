# Notifications System - Quick Start

## Step 1: Run SQL Migration (REQUIRED)

1. Open Supabase SQL Editor
2. Copy the entire contents of `create_notifications_system.sql`
3. Paste and run it
4. You should see: "Notifications system created successfully!"

## Step 2: Add Notifications Component to Sidebar

### Option A: Add to Sidebar Header (Recommended)

In `src/components/Sidebar.tsx`, add the import at the top:

```typescript
import Notifications from '@/components/Notifications'
```

Then find the sidebar header section (usually near the top of the sidebar) and add:

```typescript
<Notifications onNavigateToProfile={(userId) => onPageChange('profile')} />
```

### Option B: Add to Dashboard Header

If you have a header/navbar component, you can add it there instead:

```typescript
import Notifications from '@/components/Notifications'

// In your header:
<Notifications onNavigateToProfile={handleNavigateToProfile} />
```

## Step 3: Test the System

### Test Friend Request Notification:
1. Login as User A
2. Go to User B's profile
3. Click "Add friend"
4. Login as User B
5. You should see a notification bell with badge "1"
6. Click the bell
7. You should see "New Friend Request" from User A
8. Click the notification to go to User A's profile

### Test Friend Accepted Notification:
1. As User B, accept the friend request
2. Login as User A
3. You should see notification bell with badge "1"
4. Click the bell
5. You should see "Friend Request Accepted" from User B
6. Click the notification to go to User B's profile

## Features You Get:

✅ Real-time notifications (no refresh needed)
✅ Unread count badge on bell icon
✅ Click notification to navigate to profile
✅ Mark individual notifications as read
✅ Mark all notifications as read
✅ Delete individual notifications
✅ Auto-mark as read when clicked
✅ Time ago display (e.g., "5m ago", "2h ago")
✅ Different icons for different notification types

## Notification Types:

1. **Friend Request** (Blue icon with user+)
   - When someone sends you a friend request
   
2. **Friend Accepted** (Green checkmark)
   - When someone accepts your friend request

## Troubleshooting:

### Notifications not showing up?
1. Make sure you ran the SQL migration
2. Check browser console for errors
3. Verify the Notifications component is imported and rendered

### Badge count not updating?
1. Check if real-time subscriptions are working
2. Verify Supabase real-time is enabled in your project
3. Check browser console for subscription errors

### Can't click notifications?
1. Make sure `onNavigateToProfile` function is passed correctly
2. Check if the function navigates to the profile page

## Next Steps:

Once notifications are working, you can:
- Customize notification styles
- Add more notification types (messages, system alerts)
- Add notification sounds
- Add email notifications
- Add notification preferences

## Files Created:

- `create_notifications_system.sql` - Database schema and functions
- `src/components/Notifications.tsx` - Notifications UI component
- `NOTIFICATIONS_IMPLEMENTATION_GUIDE.md` - Detailed guide
- `NOTIFICATIONS_QUICK_START.md` - This file
