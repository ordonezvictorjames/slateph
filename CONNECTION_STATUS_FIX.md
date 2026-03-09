# Connection Status Fix

## Problem
After sending a friend request, the button was still showing "Add friend" instead of "Cancel request". The connection status wasn't updating properly.

## Root Causes

### 1. Complex OR Query Not Working
The original query used a complex OR condition:
```typescript
.or(`and(user_id.eq.${user.id},friend_id.eq.${displayUserId}),and(user_id.eq.${displayUserId},friend_id.eq.${user.id})`)
```

This syntax might not work correctly with Supabase client.

### 2. Manual State Update Instead of Database Refresh
After sending a friend request, the code was manually setting `connectionStatus` to 'pending' instead of querying the database to confirm the connection was created.

## Solutions

### 1. Simplified Connection Status Query
Changed from complex OR query to two separate queries:

```typescript
const checkConnectionStatus = async () => {
  if (!user?.id || !displayUserId) {
    console.log('Cannot check connection status: missing user IDs', { userId: user?.id, displayUserId })
    return
  }

  try {
    console.log('Checking connection status between:', user.id, 'and', displayUserId)
    
    // Check both directions separately
    const { data: connection1, error: error1 } = await supabase
      .from('connections')
      .select('status')
      .eq('user_id', user.id)
      .eq('friend_id', displayUserId)
      .maybeSingle()

    if (error1) {
      console.error('Error checking connection (direction 1):', error1)
    }

    const { data: connection2, error: error2 } = await supabase
      .from('connections')
      .select('status')
      .eq('user_id', displayUserId)
      .eq('friend_id', user.id)
      .maybeSingle()

    if (error2) {
      console.error('Error checking connection (direction 2):', error2)
    }

    // Use whichever connection exists
    const connection = connection1 || connection2
    const status = connection?.status || 'none'
    
    console.log('Connection found:', connection)
    console.log('Connection status:', status)
    setConnectionStatus(status)
  } catch (error) {
    console.error('Error checking connection status:', error)
    setConnectionStatus('none')
  }
}
```

**Benefits:**
- Simpler queries that definitely work
- Checks both directions (user_id → friend_id and friend_id → user_id)
- Better error handling for each direction
- More detailed logging

### 2. Refresh Status from Database After Sending Request

Changed from manual state update to database refresh:

**Before:**
```typescript
if (data.success) {
  showSuccess('Request Sent', data.message)
  if (!isOwnProfile) {
    setConnectionStatus('pending')  // Manual update
  }
}
```

**After:**
```typescript
if (data.success) {
  showSuccess('Request Sent', data.message)
  console.log('Friend request sent successfully, refreshing connection status')
  
  // Refresh connection status from database
  if (!isOwnProfile) {
    await checkConnectionStatus()  // Query database
  }
}
```

**Benefits:**
- Confirms the connection was actually created in database
- Gets the actual status from database (more reliable)
- Handles any edge cases or database triggers

## Enhanced Logging

Added comprehensive logging throughout:

1. **checkConnectionStatus:**
   - Logs user IDs being checked
   - Logs each query result
   - Logs final status

2. **sendFriendRequest:**
   - Logs request being sent
   - Logs RPC response
   - Logs status refresh

## Testing Steps

1. Open browser console (F12)
2. Navigate to another user's profile
3. Check console for: "Checking connection status between: [UUID] and [UUID]"
4. Check console for: "Connection status: none"
5. Click "Add friend"
6. Check console for: "Sending friend request from [UUID] to [UUID]"
7. Check console for: "Friend request response: {success: true, message: '...'}"
8. Check console for: "Friend request sent successfully, refreshing connection status"
9. Check console for: "Connection found: {status: 'pending'}"
10. Check console for: "Connection status: pending"
11. Button should now show "Cancel request"

## Debugging

If button still shows "Add friend" after sending request:

1. **Check Console Logs:**
   - Look for "Connection status: pending" after sending request
   - If it shows "Connection status: none", the database query failed

2. **Check Database:**
   Run in Supabase SQL Editor:
   ```sql
   SELECT * FROM connections 
   WHERE status = 'pending' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   - Should show the connection you just created

3. **Check RLS Policies:**
   Run in Supabase SQL Editor:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'connections';
   ```
   - Should show policies allowing SELECT for authenticated users

4. **Test Query Directly:**
   Replace UUIDs with your actual user IDs:
   ```sql
   SELECT status FROM connections
   WHERE user_id = 'YOUR_USER_ID'
     AND friend_id = 'OTHER_USER_ID';
   ```

## Files Modified
- `src/components/pages/ProfilePage.tsx`
  - Updated `checkConnectionStatus()` - simpler two-query approach
  - Updated `sendFriendRequest()` - refresh status from database
  - Added comprehensive logging throughout

## Related Files
- `test_connection_status_query.sql` - SQL queries for testing
- `CANCEL_REQUEST_UPDATE.md` - Cancel request button implementation
