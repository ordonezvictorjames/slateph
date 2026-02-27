# Session Cookie Size Fix

## Problem
The application was experiencing `ERR_RESPONSE_HEADERS_TOO_BIG` errors because the session cookie was storing the entire user object, exceeding browser cookie size limits (typically 4KB).

## Root Cause
- Storing complete user profile data in cookie (first_name, last_name, avatar_url, banner_url, spotify_url, bio, timestamps, etc.)
- Cookie size exceeded ~4KB limit
- Browser rejected the response headers

## Solution Implemented

### 1. Minimal Cookie Storage
Changed the session cookie to store only essential data:
```typescript
{
  userId: string,  // User ID
  role: string,    // User role
  email: string    // User email
}
```

**Cookie size reduced from ~4KB to ~100 bytes**

### 2. Database-Backed Session Restoration
When retrieving a session:
1. Read minimal data from cookie (userId, role, email)
2. Fetch complete user profile from Supabase database
3. Reconstruct full AuthUser object in memory

### 3. Files Modified

#### `src/app/api/auth/session/route.ts`
- **GET**: Returns `{ session: { userId, role, email } }` or `{ session: null }`
- **POST**: Accepts `{ userId, role, email }` and stores in cookie
- **DELETE**: Clears the session cookie

#### `src/contexts/AuthContext.tsx`
- **checkSession**: Fetches minimal session data, then queries database for full profile
- **signIn**: Stores only `{ userId, role, email }` in cookie
- **refreshUser**: Updates cookie with minimal data only

## Benefits

### Security
✅ Smaller attack surface (less data in cookie)
✅ HTTP-only cookies (XSS protection)
✅ Secure flag in production
✅ SameSite protection (CSRF prevention)

### Performance
✅ Faster cookie transmission (100 bytes vs 4KB)
✅ No header size errors
✅ Fresh data from database on each session check

### Reliability
✅ No more `ERR_RESPONSE_HEADERS_TOO_BIG` errors
✅ Works across all browsers
✅ Handles profile updates automatically (fetched from DB)

## Technical Details

### Cookie Structure
```json
{
  "userId": "uuid-string",
  "role": "admin|instructor|student|developer",
  "email": "user@example.com"
}
```

### Session Flow

**Login:**
1. User authenticates with Supabase RPC
2. Create full AuthUser object in memory
3. Store minimal data (userId, role, email) in cookie
4. Set user state in React context

**Page Load:**
1. Check for session cookie
2. If exists, extract userId
3. Query Supabase for full profile data
4. Reconstruct AuthUser object
5. Set user state in React context

**Logout:**
1. Clear session cookie
2. Clear user state

## Testing Checklist

- [x] Login works without cookie size errors
- [x] Session persists across page refreshes
- [x] User profile data loads correctly
- [x] Logout clears session properly
- [x] No `ERR_RESPONSE_HEADERS_TOO_BIG` errors
- [x] Cookie size under 4KB limit
- [x] Profile updates reflect correctly

## Migration Notes

**For existing users:**
- Old large cookies will be ignored
- Users will need to log in again (one-time)
- No data loss (everything in database)

---

**Updated:** February 27, 2026
**Status:** ✅ Fixed
**Cookie Size:** ~100 bytes (was ~4KB)
