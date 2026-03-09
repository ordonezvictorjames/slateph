# Friends System - Complete Implementation Guide

## Overview
Facebook-style friend system with friend requests, accept/reject, and friends list.

## Database Setup

### Tables
- `connections`: Stores friend relationships with status (pending, accepted, rejected, blocked)

### Functions (Available but not used in frontend)
- `send_friend_request(user_id, friend_id)`: Send friend request
- `accept_friend_request(user_id, friend_id)`: Accept request
- `reject_friend_request(user_id, friend_id)`: Reject request
- `remove_friend(user_id, friend_id)`: Remove friend
- `get_user_friends(user_id)`: Get list of friends
- `get_pending_requests(user_id)`: Get pending requests
- `get_connection_status(user_id, other_user_id)`: Check connection status

### Setup Files
1. `create_connections_system.sql` - Creates tables and functions
2. `fix_friends_auth.sql` - Fixes RLS policies for custom auth

## Frontend Implementation

### ProfilePage.tsx Features

#### 1. Friends List (Sidebar Card)
- Shows friend count
- Displays up to 6 friends with avatars
- Shows pending friend requests (own profile only)
- Accept/reject buttons for pending requests
- Click friend to navigate to their profile

#### 2. Profile Action Buttons (Header)
When viewing other profiles:
- **Message** button (placeholder)
- **Add friend** button (blue) - Shows when no connection
- **Request sent** button (gray, disabled) - Shows when request pending
- **Friends** button (gray, clickable) - Shows when friends, click to remove
- **View profile** button (placeholder)

When viewing own profile:
- **Edit Profile** button only

#### 3. Data Loading
Uses direct table queries instead of RPC functions:
- `loadFriends()`: Queries connections + profiles tables
- `loadPendingRequests()`: Queries connections + profiles tables
- `checkConnectionStatus()`: Queries connections table

#### 4. Friend Actions
Still uses RPC functions for mutations:
- `sendFriendRequest()`: Sends friend request
- `acceptFriendRequest()`: Accepts request
- `rejectFriendRequest()`: Rejects request
- `removeFriend()`: Removes friend connection

## User Flow

### Adding a Friend
1. User A visits User B's profile
2. Sees "Add friend" button (blue)
3. Clicks button
4. Button changes to "Request sent" (gray, disabled)
5. User B sees notification in Friends card
6. User B clicks checkmark to accept
7. Both users now see each other in friends list
8. Button changes to "Friends" (gray, clickable)

### Removing a Friend
1. User visits friend's profile
2. Sees "Friends" button
3. Clicks button
4. Confirmation dialog appears
5. Confirms removal
6. Friend removed from both users' lists
7. Button changes back to "Add friend"

### Rejecting a Request
1. User sees pending request in Friends card
2. Clicks X button
3. Request removed
4. Sender's button changes back to "Add friend"

## Technical Details

### State Management
```typescript
const [friends, setFriends] = useState<Friend[]>([])
const [pendingRequests, setPendingRequests] = useState<Friend[]>([])
const [connectionStatus, setConnectionStatus] = useState<string>('none')
const [loadingFriends, setLoadingFriends] = useState(true)
const [actionLoading, setActionLoading] = useState<string | null>(null)
```

### Connection Status Values
- `'none'`: No connection
- `'pending'`: Request sent, waiting for response
- `'accepted'`: Friends
- `'rejected'`: Request was rejected
- `'blocked'`: User is blocked

### Loading States
- `loadingFriends`: Shows loading spinner in Friends card
- `actionLoading`: Disables buttons during friend actions

### Error Handling
- All functions have try-catch blocks
- Detailed console logging for debugging
- User-friendly toast messages
- Graceful fallbacks (empty arrays)

## Styling

### Button States
- **Add friend**: `bg-blue-600 text-white` (primary action)
- **Request sent**: `bg-gray-100 text-gray-600` (disabled)
- **Friends**: `bg-gray-100 text-gray-700` (secondary action)
- **Message/View profile**: `bg-gray-100 text-gray-700` (secondary)

### Responsive Design
- Mobile: Stacked buttons, smaller text
- Desktop: Horizontal layout, larger buttons
- Friends card: Scrollable list on mobile

## Database Queries

### Get Friends
```sql
-- Get connections
SELECT user_id, friend_id 
FROM connections 
WHERE (user_id = ? OR friend_id = ?) 
  AND status = 'accepted'

-- Get profiles
SELECT id, first_name, last_name, email, role, avatar_url
FROM profiles
WHERE id IN (friend_ids)
```

### Get Pending Requests
```sql
-- Get connections
SELECT user_id 
FROM connections 
WHERE friend_id = ? 
  AND status = 'pending'

-- Get profiles
SELECT id, first_name, last_name, email, role, avatar_url
FROM profiles
WHERE id IN (sender_ids)
```

### Check Connection Status
```sql
SELECT status 
FROM connections 
WHERE (user_id = ? AND friend_id = ?)
   OR (user_id = ? AND friend_id = ?)
```

## Testing Checklist

- [ ] View own profile - see Friends card
- [ ] View other profile - see action buttons
- [ ] Click "Add friend" - request sent
- [ ] See pending request in Friends card
- [ ] Accept request - becomes friend
- [ ] See friend in friends list
- [ ] Click friend - navigate to profile
- [ ] Click "Friends" button - remove friend
- [ ] Reject request - request removed
- [ ] Check console logs - no errors
- [ ] Test on mobile - responsive layout

## Troubleshooting

### Friends not loading
1. Check console for errors
2. Verify connections table exists
3. Check RLS policies allow SELECT
4. Verify user ID is valid UUID

### Add friend button not working
1. Check console for RPC errors
2. Verify send_friend_request function exists
3. Check RLS policies allow INSERT
4. Verify both user IDs are valid

### Pending requests not showing
1. Check connections table for pending status
2. Verify loadPendingRequests is called
3. Check console logs
4. Verify RLS policies allow SELECT

### Button not updating after action
1. Check if action succeeded (console logs)
2. Verify state is being updated
3. Check if loadFriends/checkConnectionStatus is called
4. Verify real-time updates are working

## Files Modified
- `src/components/pages/ProfilePage.tsx` - Main implementation
- `create_connections_system.sql` - Database schema
- `fix_friends_auth.sql` - RLS policy fixes

## Documentation Files
- `FRIENDS_SYSTEM_IMPLEMENTATION.md` - Original implementation
- `FRIENDS_SYSTEM_FIX.md` - Fix for RPC issues
- `FRIENDS_DEBUG_STEPS.md` - Debug guide
- `ALTERNATIVE_FRIENDS_APPROACH.md` - Alternative implementation
- `FRIENDS_SYSTEM_COMPLETE_GUIDE.md` - This file
