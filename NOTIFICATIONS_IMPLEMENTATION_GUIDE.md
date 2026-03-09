# Friend Request Notifications Implementation Guide

## Overview
This system sends notifications when:
1. Someone sends you a friend request
2. Someone accepts your friend request

## Database Setup

### Step 1: Run the SQL Migration
Run `create_notifications_system.sql` in Supabase SQL Editor. This creates:

**Tables:**
- `notifications` - Stores all notifications

**Functions:**
- `create_notification()` - Creates a new notification
- `get_user_notifications()` - Gets user's notifications
- `mark_notification_read()` - Marks single notification as read
- `mark_all_notifications_read()` - Marks all as read
- `get_unread_notification_count()` - Gets count of unread notifications
- `delete_notification()` - Deletes a notification

**Updated Functions:**
- `send_friend_request()` - Now creates notification for recipient
- `accept_friend_request()` - Now creates notification for sender

## Frontend Integration

### Step 1: Add Notifications Component to Sidebar

Update `src/components/Sidebar.tsx` to include the Notifications component:

```typescript
import Notifications from '@/components/Notifications'

// In the sidebar header, add the Notifications component:
<div className="flex items-center gap-2">
  <Notifications onNavigateToProfile={onNavigateToProfile} />
  {/* ... other header items ... */}
</div>
```

### Step 2: Pass Navigation Function

Make sure your Sidebar component has access to the profile navigation function:

```typescript
interface SidebarProps {
  onNavigateToProfile?: (userId?: string) => void
}

export default function Sidebar({ onNavigateToProfile }: SidebarProps) {
  // ...
}
```

### Step 3: Update Dashboard Component

In `src/components/Dashboard.tsx`, pass the navigation function to Sidebar:

```typescript
<Sidebar onNavigateToProfile={handleNavigateToProfile} />
```

## Features

### Notification Bell
- Shows unread count badge
- Red badge with number (9+ for 10 or more)
- Click to open dropdown

### Notifications Dropdown
- Shows last 20 notifications
- Real-time updates via Supabase subscriptions
- "Mark all read" button
- Individual delete buttons
- Click notification to navigate to related profile
- Auto-marks as read when clicked

### Notification Types

#### Friend Request
- **Icon**: User with plus sign (blue)
- **Title**: "New Friend Request"
- **Message**: "[Name] sent you a friend request"
- **Action**: Click to view sender's profile

#### Friend Accepted
- **Icon**: Checkmark in circle (green)
- **Title**: "Friend Request Accepted"
- **Message**: "[Name] accepted your friend request"
- **Action**: Click to view friend's profile

### Real-time Updates
- Notifications appear instantly via Supabase real-time subscriptions
- Unread count updates automatically
- No page refresh needed

## User Flow

### Scenario 1: Receiving Friend Request
1. User A sends friend request to User B
2. User B sees notification bell badge increase
3. User B clicks bell, sees "New Friend Request" notification
4. User B clicks notification, navigates to User A's profile
5. User B can accept/reject the request

### Scenario 2: Request Accepted
1. User A sent friend request to User B
2. User B accepts the request
3. User A sees notification bell badge increase
4. User A clicks bell, sees "Friend Request Accepted" notification
5. User A clicks notification, navigates to User B's profile
6. Both users are now friends

## Styling

### Unread Notifications
- Light blue background (`bg-blue-50`)
- Stands out from read notifications

### Read Notifications
- White background
- Gray text for timestamp

### Notification Bell
- Gray icon with hover effect
- Red badge for unread count
- Positioned in sidebar header

## Database Schema

```sql
notifications (
  id UUID PRIMARY KEY,
  user_id UUID (recipient),
  type TEXT (friend_request, friend_accepted, message, system),
  title TEXT,
  message TEXT,
  related_user_id UUID (sender/friend),
  related_item_id UUID (optional),
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

## API Functions

### Get Notifications
```typescript
const { data, error } = await supabase.rpc('get_user_notifications', {
  p_user_id: user.id,
  p_limit: 20,
  p_unread_only: false
})
```

### Get Unread Count
```typescript
const { data, error } = await supabase.rpc('get_unread_notification_count', {
  p_user_id: user.id
})
```

### Mark as Read
```typescript
const { error } = await supabase.rpc('mark_notification_read', {
  p_notification_id: notificationId,
  p_user_id: user.id
})
```

### Mark All as Read
```typescript
const { error } = await supabase.rpc('mark_all_notifications_read', {
  p_user_id: user.id
})
```

### Delete Notification
```typescript
const { error } = await supabase.rpc('delete_notification', {
  p_notification_id: notificationId,
  p_user_id: user.id
})
```

## Testing Checklist

- [ ] Run SQL migration in Supabase
- [ ] Add Notifications component to Sidebar
- [ ] Send friend request - recipient sees notification
- [ ] Click notification - navigates to sender's profile
- [ ] Accept friend request - sender sees notification
- [ ] Click notification - navigates to friend's profile
- [ ] Mark notification as read - badge count decreases
- [ ] Mark all as read - all notifications marked
- [ ] Delete notification - removed from list
- [ ] Real-time updates work without refresh
- [ ] Unread count shows correctly
- [ ] Dropdown closes when clicking outside

## Troubleshooting

### Notifications not appearing
1. Check if SQL migration ran successfully
2. Verify RLS is disabled on notifications table
3. Check browser console for errors
4. Verify user ID is correct

### Real-time not working
1. Check Supabase real-time is enabled
2. Verify subscription is set up correctly
3. Check browser console for subscription errors

### Count not updating
1. Check if `get_unread_notification_count` function exists
2. Verify function is being called after actions
3. Check if notifications are being marked as read

## Future Enhancements

- Message notifications
- System notifications
- Email notifications
- Push notifications
- Notification preferences
- Notification sounds
- Group notifications by type
- Pagination for old notifications
