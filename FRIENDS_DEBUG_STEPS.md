# Friends System Debug Steps

## Current Issue
RPC calls to `get_user_friends` and `get_pending_requests` are failing with empty error objects `{}`.

## Debug Steps

### Step 1: Verify Functions Exist
Run this in Supabase SQL Editor:

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_user_friends',
    'get_pending_requests',
    'get_connection_status'
  )
ORDER BY routine_name;
```

**Expected Result:** Should show all 3 function names.

### Step 2: Get Real User IDs
Run this to get actual user IDs from your database:

```sql
SELECT 
    id,
    first_name,
    last_name,
    email,
    role
FROM profiles
ORDER BY created_at DESC
LIMIT 5;
```

**Action:** Copy one of the `id` values (it's a UUID like `123e4567-e89b-12d3-a456-426614174000`)

### Step 3: Test get_user_friends Function
Replace `YOUR_ACTUAL_UUID_HERE` with a real UUID from Step 2:

```sql
SELECT * FROM get_user_friends('YOUR_ACTUAL_UUID_HERE');
```

**Expected Result:** 
- If user has no friends: Empty result (0 rows)
- If user has friends: List of friend profiles
- If error: Error message will show

### Step 4: Test get_pending_requests Function
Replace `YOUR_ACTUAL_UUID_HERE` with a real UUID from Step 2:

```sql
SELECT * FROM get_pending_requests('YOUR_ACTUAL_UUID_HERE');
```

**Expected Result:**
- If no pending requests: Empty result (0 rows)
- If has pending requests: List of users who sent requests
- If error: Error message will show

### Step 5: Check Connections Table
```sql
SELECT * FROM connections ORDER BY created_at DESC LIMIT 10;
```

**Expected Result:** Shows any existing friend connections (may be empty if no one has added friends yet)

### Step 6: Test Creating a Connection
Replace both UUIDs with real user IDs from Step 2 (use two different users):

```sql
SELECT send_friend_request('USER_1_UUID', 'USER_2_UUID');
```

**Expected Result:** 
```json
{"success": true, "message": "Friend request sent"}
```

### Step 7: Verify Connection Was Created
```sql
SELECT 
    c.*,
    p1.first_name || ' ' || p1.last_name as sender,
    p2.first_name || ' ' || p2.last_name as receiver
FROM connections c
JOIN profiles p1 ON p1.id = c.user_id
JOIN profiles p2 ON p2.id = c.friend_id
ORDER BY c.created_at DESC
LIMIT 5;
```

## Common Issues and Solutions

### Issue 1: Functions Don't Exist
**Solution:** Run `create_connections_system.sql` in Supabase SQL Editor

### Issue 2: RLS Blocking Access
**Solution:** Run `fix_friends_auth.sql` in Supabase SQL Editor

### Issue 3: Empty Error Objects in Browser
**Possible Causes:**
1. Supabase client not properly initialized
2. Network/CORS issue
3. Function permissions not granted
4. Invalid UUID format being passed

**Solution:** 
- Check browser console for the new detailed error logs
- Verify the user ID being passed is a valid UUID
- Check Network tab in browser DevTools for the actual API response

### Issue 4: "invalid input syntax for type uuid"
**Cause:** Passing a string like 'YOUR_USER_ID_HERE' instead of actual UUID

**Solution:** Use real UUIDs from the profiles table (Step 2)

## Next Steps After Testing

1. Run Steps 1-5 in Supabase SQL Editor
2. Share the results with me
3. If functions work in SQL but fail in browser:
   - Check browser console for new detailed error logs
   - Check Network tab for API response
   - Verify Supabase client configuration

4. If functions don't work in SQL:
   - Share the error message
   - We'll fix the function definitions
