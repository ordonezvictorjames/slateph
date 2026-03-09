# Cancel Request Button Update

## Change Summary
Updated the friend request button behavior to show "Cancel request" instead of disabled "Request sent" when a user has already sent a friend request.

## What Changed

### Before
- **Add friend** (blue) → User clicks → **Request sent** (gray, disabled)
- User couldn't cancel the request from the profile page

### After
- **Add friend** (blue) → User clicks → **Cancel request** (gray, clickable)
- User can now cancel their pending friend request

## Button States

### 1. No Connection (`connectionStatus === 'none'`)
- **Button**: "Add friend" (blue, primary)
- **Icon**: User with plus sign
- **Action**: Sends friend request

### 2. Pending Request (`connectionStatus === 'pending'`)
- **Button**: "Cancel request" (gray, secondary)
- **Icon**: X (close/cancel icon)
- **Action**: Cancels the friend request
- **Confirmation**: "Are you sure you want to cancel this friend request?"

### 3. Friends (`connectionStatus === 'accepted'`)
- **Button**: "Friends" (gray, secondary)
- **Icon**: Checkmark
- **Action**: Removes friend
- **Confirmation**: "Are you sure you want to remove this friend?"

## Technical Changes

### 1. Updated Button Rendering
```typescript
{connectionStatus === 'pending' && (
  <button
    onClick={() => removeFriend(displayUserId!, true)}
    disabled={actionLoading === displayUserId}
    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
  >
    {actionLoading === displayUserId && <ButtonLoading />}
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
    Cancel request
  </button>
)}
```

### 2. Updated removeFriend Function
```typescript
const removeFriend = async (friendId: string, isCancelRequest: boolean = false) => {
  if (!user?.id) return

  // Different confirmation messages based on action
  const confirmMessage = isCancelRequest 
    ? 'Are you sure you want to cancel this friend request?'
    : 'Are you sure you want to remove this friend?'
  
  if (!confirm(confirmMessage)) return

  try {
    setActionLoading(friendId)
    const { data, error } = await supabase.rpc('remove_friend', {
      p_user_id: user.id,
      p_friend_id: friendId
    })

    if (error) throw error

    if (data.success) {
      const successMessage = isCancelRequest ? 'Friend request cancelled' : 'Friend removed'
      showSuccess('Success', successMessage)
      loadFriends()
      if (!isOwnProfile) {
        setConnectionStatus('none')
      }
    } else {
      showError('Error', data.message)
    }
  } catch (error: any) {
    showError('Error', error.message)
  } finally {
    setActionLoading(null)
  }
}
```

## User Experience Flow

### Scenario 1: Sending and Canceling Request
1. User A visits User B's profile
2. Sees "Add friend" button (blue)
3. Clicks "Add friend"
4. Button changes to "Cancel request" (gray)
5. User A changes mind, clicks "Cancel request"
6. Confirmation dialog: "Are you sure you want to cancel this friend request?"
7. Confirms cancellation
8. Success message: "Friend request cancelled"
9. Button changes back to "Add friend" (blue)

### Scenario 2: Request Accepted
1. User A sends request to User B
2. User A sees "Cancel request" on User B's profile
3. User B accepts the request
4. User A's button changes to "Friends" (gray)
5. Both users see each other in friends list

### Scenario 3: Removing Friend
1. User A and User B are friends
2. User A visits User B's profile
3. Sees "Friends" button (gray)
4. Clicks "Friends"
5. Confirmation dialog: "Are you sure you want to remove this friend?"
6. Confirms removal
7. Success message: "Friend removed"
8. Button changes to "Add friend" (blue)

## Benefits

1. **User Control**: Users can cancel requests they sent by mistake
2. **Clear Intent**: Different messages for different actions
3. **Better UX**: No disabled buttons that users can't interact with
4. **Consistency**: Same button location for all friend-related actions
5. **Feedback**: Different success messages for cancel vs remove

## Testing Checklist

- [ ] Send friend request - button changes to "Cancel request"
- [ ] Cancel request - shows confirmation dialog
- [ ] Confirm cancellation - request removed, button back to "Add friend"
- [ ] Send request again - works correctly
- [ ] Request accepted - button changes to "Friends"
- [ ] Remove friend - shows different confirmation dialog
- [ ] Confirm removal - friend removed, button back to "Add friend"
- [ ] Loading states work during actions
- [ ] Success messages are appropriate for each action

## Files Modified
- `src/components/pages/ProfilePage.tsx`
  - Updated button rendering for pending status
  - Updated `removeFriend` function to handle both cases
  - Added `isCancelRequest` parameter
  - Different confirmation messages
  - Different success messages
