## Summary

I've created a complete user sessions tracking system that records devices and IP addresses. Here's what you need to do:

### Step 1: Run SQL Migration (REQUIRED)

1. Open Supabase SQL Editor
2. Copy and run `create_user_sessions_tracking.sql`
3. This creates the `user_sessions` table and functions

### Step 2: Track Sessions on Login

In your login/authentication code (likely in `AuthContext.tsx` or login handler), add session tracking:

```typescript
import { getDeviceInfo, getIPAddress } from '@/utils/deviceDetection'

// After successful login:
const deviceInfo = getDeviceInfo()
const ipAddress = await getIPAddress()

await supabase.rpc('record_user_session', {
  p_user_id: user.id,
  p_ip_address: ipAddress,
  p_device_type: deviceInfo.deviceType,
  p_browser: deviceInfo.browser,
  p_os: deviceInfo.os,
  p_user_agent: deviceInfo.userAgent
})
```

### Step 3: Add Sessions Button to User Management

In your `UserModals.tsx` or user management component, add a button to view sessions:

```typescript
import UserSessionsModal from '@/components/UserSessionsModal'

// Add state
const [showSessionsModal, setShowSessionsModal] = useState(false)
const [selectedUserForSessions, setSelectedUserForSessions] = useState<any>(null)

// Add button in user row
<button
  onClick={() => {
    setSelectedUserForSessions(user)
    setShowSessionsModal(true)
  }}
  className="text-blue-600 hover:text-blue-700"
  title="View Sessions"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
</button>

// Add modal at the end
{showSessionsModal && selectedUserForSessions && (
  <UserSessionsModal
    userId={selectedUserForSessions.id}
    userName={`${selectedUserForSessions.profile.first_name} ${selectedUserForSessions.profile.last_name}`}
    onClose={() => {
      setShowSessionsModal(false)
      setSelectedUserForSessions(null)
    }}
  />
)}
```

## Features

### Session Tracking
- Automatically records device type (mobile/tablet/desktop)
- Captures browser name (Chrome, Firefox, Safari, etc.)
- Detects operating system (Windows, macOS, Linux, iOS, Android)
- Records IP address
- Tracks last active time
- Marks sessions as active/inactive

### User Sessions Modal
- Shows all active and inactive sessions
- Displays device information with icons
- Shows IP addresses
- Shows "last active" time
- Allows ending individual sessions
- Color-coded (green for active, gray for inactive)

### Security Features
- Admins can view all user sessions
- Can end suspicious sessions
- Track login locations via IP
- Monitor device usage patterns
- Detect unauthorized access

## Database Schema

```sql
user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID (references profiles),
  ip_address TEXT,
  device_type TEXT (mobile, tablet, desktop),
  browser TEXT,
  os TEXT,
  device_name TEXT (auto-generated friendly name),
  user_agent TEXT,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_active BOOLEAN
)
```

## API Functions

### Record Session
```typescript
await supabase.rpc('record_user_session', {
  p_user_id: userId,
  p_ip_address: '192.168.1.1',
  p_device_type: 'desktop',
  p_browser: 'Chrome',
  p_os: 'Windows',
  p_user_agent: navigator.userAgent
})
```

### Get Sessions
```typescript
const { data } = await supabase.rpc('get_user_sessions', {
  p_user_id: userId,
  p_active_only: false
})
```

### End Session
```typescript
await supabase.rpc('end_user_session', {
  p_session_id: sessionId,
  p_user_id: userId
})
```

### End All Other Sessions
```typescript
await supabase.rpc('end_all_other_sessions', {
  p_user_id: userId,
  p_current_session_id: currentSessionId
})
```

## Use Cases

1. **Security Monitoring**: Track where users are logging in from
2. **Suspicious Activity**: Detect logins from unusual locations
3. **Session Management**: Allow users to log out from other devices
4. **Compliance**: Keep audit logs of user access
5. **Support**: Help users troubleshoot login issues

## Testing

1. Run SQL migration
2. Add session tracking to login
3. Login from different devices/browsers
4. View sessions in user management
5. End a session and verify it becomes inactive
6. Check IP addresses are recorded correctly

## Privacy Considerations

- IP addresses are personal data - inform users in privacy policy
- Consider GDPR/privacy regulations in your region
- Allow users to view their own sessions
- Provide option to clear old sessions
- Don't store more data than necessary

## Future Enhancements

- Geolocation from IP address
- Email alerts for new device logins
- Automatic session expiry after inactivity
- Device fingerprinting for better tracking
- Session history export
- Suspicious login detection
