# Inactive Account Auto-Deletion System

## Overview
Automatically deletes inactive accounts after 3 days, except for Developer role accounts.

## Policy

| Account Status | Role | Action |
|---------------|------|--------|
| Inactive | Developer | **Never deleted** (protected) |
| Inactive | All others | **Deleted after 3 days** |
| Active | Any | Never deleted |

## How It Works

### 1. Status Tracking
When an account status changes to "inactive":
- `inactive_since` timestamp is automatically set
- 3-day countdown begins

### 2. Automatic Deletion
After 3 days of being inactive:
- Account is permanently deleted
- All associated data is removed
- Developer accounts are exempt

### 3. Reactivation
If account is reactivated before 3 days:
- `inactive_since` is cleared
- Deletion countdown is cancelled
- Account remains active

## Installation

Run in Supabase SQL Editor:
```bash
add_inactive_account_deletion.sql
```

This will:
1. Add `inactive_since` column to profiles
2. Create trigger to track status changes
3. Create deletion function
4. Create helper functions for monitoring

## Database Functions

### 1. Delete Old Inactive Accounts
```sql
-- Run this daily via cron job
SELECT delete_old_inactive_accounts();
```

Returns:
```json
{
  "success": true,
  "deleted_count": 5,
  "deleted_users": [...],
  "timestamp": "2024-03-08T10:00:00Z"
}
```

### 2. Get Accounts Pending Deletion
```sql
-- Get accounts that will be deleted in next 24 hours
SELECT * FROM get_accounts_pending_deletion(24);

-- Get accounts that will be deleted in next 48 hours
SELECT * FROM get_accounts_pending_deletion(48);
```

Returns:
- User details
- When they became inactive
- Hours until deletion

### 3. Prevent Account Deletion (Reactivate)
```sql
-- Reactivate account to prevent deletion
SELECT prevent_account_deletion('user-id-here');
```

## Automated Cleanup Setup

### Option 1: Supabase Edge Function (Recommended)

Create a scheduled edge function:

```typescript
// supabase/functions/cleanup-inactive-accounts/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Delete old inactive accounts
  const { data: deleteResult, error: deleteError } = await supabaseClient
    .rpc('delete_old_inactive_accounts')

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Also disable expired accounts
  const { data: expiredResult, error: expiredError } = await supabaseClient
    .rpc('disable_expired_accounts')

  return new Response(
    JSON.stringify({ 
      success: true,
      inactive_deleted: deleteResult,
      expired_disabled: expiredResult,
      timestamp: new Date().toISOString()
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

Schedule in Supabase Dashboard:
- Go to Edge Functions → Create cron job
- Schedule: `0 2 * * *` (daily at 2 AM)
- Function: `cleanup-inactive-accounts`

### Option 2: Manual Cleanup

Run this SQL daily:
```sql
-- Delete inactive accounts and disable expired accounts
SELECT delete_old_inactive_accounts();
SELECT disable_expired_accounts();
```

## Monitoring

### Check Inactive Accounts
```sql
SELECT 
    first_name,
    last_name,
    email,
    role,
    inactive_since,
    EXTRACT(DAY FROM (NOW() - inactive_since)) as days_inactive,
    CASE 
        WHEN role = 'developer' THEN 'Protected'
        WHEN inactive_since < NOW() - INTERVAL '3 days' THEN 'Ready for deletion'
        ELSE EXTRACT(DAY FROM ((inactive_since + INTERVAL '3 days') - NOW()))::TEXT || ' days until deletion'
    END as status
FROM profiles
WHERE status = 'inactive'
ORDER BY inactive_since ASC;
```

### Get Deletion Statistics
```sql
-- Count accounts by deletion status
SELECT 
    CASE 
        WHEN role = 'developer' THEN 'Protected (Developer)'
        WHEN inactive_since IS NULL THEN 'No deletion date'
        WHEN inactive_since < NOW() - INTERVAL '3 days' THEN 'Ready for deletion'
        WHEN inactive_since < NOW() - INTERVAL '2 days' THEN 'Deletes in < 1 day'
        WHEN inactive_since < NOW() - INTERVAL '1 day' THEN 'Deletes in < 2 days'
        ELSE 'Deletes in < 3 days'
    END as deletion_status,
    COUNT(*) as count
FROM profiles
WHERE status = 'inactive'
GROUP BY deletion_status
ORDER BY 
    CASE deletion_status
        WHEN 'Ready for deletion' THEN 1
        WHEN 'Deletes in < 1 day' THEN 2
        WHEN 'Deletes in < 2 days' THEN 3
        WHEN 'Deletes in < 3 days' THEN 4
        WHEN 'No deletion date' THEN 5
        WHEN 'Protected (Developer)' THEN 6
    END;
```

## UI Integration

### Show Deletion Warning in User Management

Add a warning badge for accounts pending deletion:

```tsx
{u.status === 'inactive' && u.inactive_since && u.role !== 'developer' && (
  (() => {
    const inactiveSince = new Date(u.inactive_since)
    const deletionDate = new Date(inactiveSince.getTime() + 3 * 24 * 60 * 60 * 1000)
    const hoursLeft = Math.ceil((deletionDate.getTime() - Date.now()) / (1000 * 60 * 60))
    
    if (hoursLeft <= 0) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          ⚠️ Pending Deletion
        </span>
      )
    } else if (hoursLeft <= 24) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
          ⏰ Deletes in {hoursLeft}h
        </span>
      )
    } else {
      const daysLeft = Math.ceil(hoursLeft / 24)
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Deletes in {daysLeft}d
        </span>
      )
    }
  })()
)}
```

### Reactivate Button

```tsx
{u.status === 'inactive' && u.role !== 'developer' && (
  <button
    onClick={() => reactivateAccount(u.id)}
    className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
  >
    Reactivate
  </button>
)}
```

## Important Notes

### Developer Protection
- Developer accounts are **never** automatically deleted
- Even if inactive for years, they remain in the database
- This prevents accidental loss of critical admin accounts

### Grace Period
- 3 days gives time to:
  - Notice the account is inactive
  - Reactivate if needed
  - Export data if necessary

### Permanent Deletion
- After 3 days, deletion is automatic
- Data cannot be recovered
- Consider backing up before deletion

## Notifications (Optional)

### Email Warnings

Send email notifications:
- Day 1: Account marked inactive
- Day 2: Deletion in 24 hours
- Day 3: Final warning (6 hours before deletion)

```sql
-- Get accounts to notify (deleting in 24 hours)
SELECT 
    email,
    first_name,
    last_name,
    EXTRACT(HOUR FROM ((inactive_since + INTERVAL '3 days') - NOW())) as hours_until_deletion
FROM profiles
WHERE status = 'inactive'
  AND role != 'developer'
  AND inactive_since BETWEEN NOW() - INTERVAL '2 days 1 hour' AND NOW() - INTERVAL '2 days';
```

## Testing

### Test the System

1. **Create test account**
```sql
-- Create test user
INSERT INTO profiles (id, email, first_name, last_name, role, status, password_hash, created_at, updated_at)
VALUES (gen_random_uuid(), 'test@example.com', 'Test', 'User', 'guest', 'active', 'dummy', NOW(), NOW());
```

2. **Mark as inactive**
```sql
UPDATE profiles 
SET status = 'inactive', inactive_since = NOW() - INTERVAL '3 days 1 hour'
WHERE email = 'test@example.com';
```

3. **Run deletion**
```sql
SELECT delete_old_inactive_accounts();
```

4. **Verify deletion**
```sql
SELECT * FROM profiles WHERE email = 'test@example.com';
-- Should return no rows
```

### Test Developer Protection

```sql
-- Create developer account
INSERT INTO profiles (id, email, first_name, last_name, role, status, password_hash, created_at, updated_at)
VALUES (gen_random_uuid(), 'dev@example.com', 'Dev', 'User', 'developer', 'inactive', 'dummy', NOW(), NOW());

-- Set as inactive for 10 days
UPDATE profiles 
SET inactive_since = NOW() - INTERVAL '10 days'
WHERE email = 'dev@example.com';

-- Try to delete
SELECT delete_old_inactive_accounts();

-- Verify developer account still exists
SELECT * FROM profiles WHERE email = 'dev@example.com';
-- Should still return the developer account
```

## Benefits

1. **Database Hygiene**
   - Removes abandoned accounts
   - Reduces storage costs
   - Keeps user list clean

2. **Security**
   - Removes inactive accounts that could be compromised
   - Reduces attack surface

3. **Compliance**
   - Automatic data retention policy
   - GDPR-friendly (removes inactive user data)

4. **Developer Safety**
   - Critical admin accounts protected
   - No accidental deletion of developers

## Rollback

To disable this feature:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS track_inactive_status_trigger ON profiles;

-- Remove functions
DROP FUNCTION IF EXISTS track_inactive_status();
DROP FUNCTION IF EXISTS delete_old_inactive_accounts();
DROP FUNCTION IF EXISTS get_accounts_pending_deletion(INTEGER);
DROP FUNCTION IF EXISTS prevent_account_deletion(UUID);

-- Remove column (optional)
ALTER TABLE profiles DROP COLUMN IF EXISTS inactive_since;
```

## Support

For issues:
1. Check `inactive_since` timestamps are being set correctly
2. Verify cron job is running daily
3. Check deletion logs in function results
4. Test with non-developer test accounts first
