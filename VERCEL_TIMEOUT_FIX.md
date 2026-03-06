# Vercel Timeout Issue - Diagnosis & Fix

## Problem
The site times out when accessing https://slateph.vercel.app/

This indicates the page is trying to load but gets stuck, likely in the `AuthContext` initialization.

## Root Cause Analysis

### Most Likely Issue: AuthContext Hanging

The `AuthContext` makes a fetch call to `/api/auth/session` on mount:

```typescript
// In AuthContext.tsx
const checkSession = async () => {
  const response = await fetch('/api/auth/session')
  // ...
}
```

**Possible causes:**
1. The `/api/auth/session` endpoint is timing out
2. The Supabase connection is hanging
3. The fetch call has no timeout and waits forever

## Immediate Fix Options

### Option 1: Add Timeout to AuthContext Fetch (RECOMMENDED)

Add a timeout to the fetch call in `AuthContext.tsx`:

```typescript
const checkSession = async () => {
  try {
    // Add timeout to fetch
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
    
    const response = await fetch('/api/auth/session', {
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      const data = await response.json()
      // ... rest of code
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Session check timed out')
    }
    console.log('No active session found')
  } finally {
    if (mounted) {
      setLoading(false) // CRITICAL: Always set loading to false
    }
  }
}
```

### Option 2: Simplify Session Check

Make the session check fail-fast:

```typescript
const checkSession = async () => {
  try {
    const response = await fetch('/api/auth/session', {
      cache: 'no-store',
      next: { revalidate: 0 }
    })
    
    // Don't wait for Supabase if session API fails
    if (!response.ok) {
      throw new Error('Session check failed')
    }
    
    const data = await response.json()
    
    // Only fetch profile if we have a valid session
    if (data.session?.id && mounted) {
      // ... fetch profile
    }
  } catch (error) {
    console.log('Session check failed:', error)
  } finally {
    if (mounted) {
      setLoading(false)
    }
  }
}
```

### Option 3: Add Loading Timeout

Add a maximum loading time in the page component:

```typescript
// In src/app/page.tsx
export default function Home() {
  const { user, loading } = useAuth()
  const [forceShow, setForceShow] = useState(false)

  useEffect(() => {
    // Force show login after 10 seconds if still loading
    const timeout = setTimeout(() => {
      setForceShow(true)
    }, 10000)
    
    return () => clearTimeout(timeout)
  }, [])

  if (loading && !forceShow) {
    return <LoadingScreen />
  }

  if (user) {
    return <Dashboard />
  }

  return <LoginForm />
}
```

## Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Click on your project
3. Go to **Deployments** → Latest deployment
4. Click **Functions** tab
5. Look for `/api/auth/session` logs

**What to look for:**
- Is the function being called?
- Is it timing out (10s limit)?
- Are there any errors?

## Check Supabase Connection

The issue might be with Supabase taking too long to respond:

1. Check if Supabase project is active
2. Check if there are any rate limits hit
3. Verify the connection string is correct

## Quick Test

To verify this is the issue, temporarily bypass the auth check:

```typescript
// In src/app/page.tsx - TEMPORARY TEST ONLY
export default function Home() {
  // const { user, loading } = useAuth()
  
  // Temporarily skip auth
  return <LoginForm />
}
```

If the site loads with this change, we know the issue is in AuthContext.

## Next Steps

1. **Check browser console** - What errors do you see?
2. **Check Vercel function logs** - Is `/api/auth/session` timing out?
3. **Apply Option 1** - Add timeout to fetch calls
4. **Test health endpoint** - Does `/api/health` work?

---

**Action Required**: Please share what you see in the browser console when visiting the site.
