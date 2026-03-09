# Alternative Approach: Direct Table Queries Instead of RPC

If the RPC functions continue to fail, we can query the tables directly from the frontend.

## Why This Might Work Better

1. RPC functions can have permission issues
2. Direct queries are simpler to debug
3. Supabase client handles direct queries more reliably
4. We already have RLS policies that allow access

## Code Changes for ProfilePage.tsx

### Replace loadFriends function:

```typescript
const loadFriends = async () => {
  if (!displayUserId) {
    console.error('Cannot load friends: displayUserId is undefined')
    return
  }

  try {
    setLoadingFriends(true)
    console.log('Loading friends for user:', displayUserId)
    
    // Query connections table directly
    const { data: connections, error: connError } = await supabase
      .from('connections')
      .select('user_id, friend_id')
      .or(`user_id.eq.${displayUserId},friend_id.eq.${displayUserId}`)
      .eq('status', 'accepted')

    if (connError) {
      console.error('Error loading connections:', connError)
      throw connError
    }

    if (!connections || connections.length === 0) {
      setFriends([])
      return
    }

    // Get friend IDs
    const friendIds = connections.map(conn => 
      conn.user_id === displayUserId ? conn.friend_id : conn.user_id
    )

    // Fetch friend profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, avatar_url')
      .in('id', friendIds)

    if (profileError) {
      console.error('Error loading friend profiles:', profileError)
      throw profileError
    }

    console.log('Friends loaded successfully:', profiles)
    setFriends(profiles || [])
  } catch (error: any) {
    console.error('Error loading friends:', error)
    showError('Error', 'Failed to load friends')
  } finally {
    setLoadingFriends(false)
  }
}
```

### Replace loadPendingRequests function:

```typescript
const loadPendingRequests = async () => {
  if (!user?.id) {
    console.error('Cannot load pending requests: user.id is undefined')
    return
  }

  try {
    console.log('Loading pending requests for user:', user.id)
    
    // Query connections where current user is the friend_id and status is pending
    const { data: connections, error: connError } = await supabase
      .from('connections')
      .select('user_id')
      .eq('friend_id', user.id)
      .eq('status', 'pending')

    if (connError) {
      console.error('Error loading pending connections:', connError)
      throw connError
    }

    if (!connections || connections.length === 0) {
      setPendingRequests([])
      return
    }

    // Get sender IDs
    const senderIds = connections.map(conn => conn.user_id)

    // Fetch sender profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, role, avatar_url')
      .in('id', senderIds)

    if (profileError) {
      console.error('Error loading sender profiles:', profileError)
      throw profileError
    }

    console.log('Pending requests loaded successfully:', profiles)
    setPendingRequests(profiles || [])
  } catch (error: any) {
    console.error('Error loading pending requests:', error)
    showError('Error', 'Failed to load pending requests')
  }
}
```

### Replace checkConnectionStatus function:

```typescript
const checkConnectionStatus = async () => {
  if (!user?.id || !displayUserId) return

  try {
    const { data, error } = await supabase
      .from('connections')
      .select('status')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${displayUserId}),and(user_id.eq.${displayUserId},friend_id.eq.${user.id})`)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No connection found
        setConnectionStatus('none')
        return
      }
      throw error
    }

    setConnectionStatus(data?.status || 'none')
  } catch (error) {
    console.error('Error checking connection status:', error)
    setConnectionStatus('none')
  }
}
```

## Benefits of This Approach

1. **More transparent**: You can see exactly what queries are being run
2. **Better error messages**: Supabase client provides clearer errors for table queries
3. **Easier to debug**: Can test queries directly in Supabase dashboard
4. **No function permissions needed**: Just relies on RLS policies

## When to Use This

Use this approach if:
- RPC functions continue to return empty errors
- You've verified functions exist but still fail
- You want simpler, more maintainable code

## When to Keep RPC Functions

Keep RPC functions if:
- They work after fixing permissions
- You need complex logic that's better in PostgreSQL
- You want to reduce number of queries from frontend
