# Account Expiration System

This system automatically manages account durations to prevent database capacity issues.

## Account Duration by Role

| Role | Duration | Auto-Expires |
|------|----------|--------------|
| Guest | 30 days | Yes |
| Student | 365 days (1 year) | Yes |
| Scholar | 730 days (2 years) | Yes |
| Admin | Permanent | No |
| Developer | Permanent | No |
| Instructor | Permanent | No |

## Setup

Run the SQL migration in Supabase SQL Editor:

```bash
# Run this file in Supabase SQL Editor
add_account_expiration.sql
```

This will:
1. Add `account_expires_at` and `account_duration_days` columns to profiles
2. Set expiration dates for existing users based on their role
3. Create triggers to automatically set expiration on new accounts
4. Create helper functions for managing expirations

## Features

### 1. Automatic Expiration on Account Creation
When a new account is created, the expiration is automatically set based on role:
- Guest accounts expire in 30 days
- Student accounts expire in 1 year
- Scholar accounts expire in 2 years
- Admin/Developer/Instructor accounts never expire

### 2. Disable Expired Accounts
Run this function periodically (daily recommended) to disable expired accounts:

```sql
SELECT disable_expired_accounts();
```

This returns the number of accounts that were disabled.

### 3. Extend Account Duration
Admins can extend account duration using the UI or SQL:

```sql
-- Extend by 30 days
SELECT extend_account_duration('user-id-here', 30);

-- Extend by 1 year
SELECT extend_account_duration('user-id-here', 365);
```

### 4. Get Expiring Accounts
Find accounts expiring soon (default: within 7 days):

```sql
-- Get accounts expiring in next 7 days
SELECT * FROM get_expiring_accounts(7);

-- Get accounts expiring in next 30 days
SELECT * FROM get_expiring_accounts(30);
```

## Automated Cleanup (Recommended)

### Option 1: Supabase Edge Function (Recommended)
Create a scheduled edge function that runs daily:

```typescript
// supabase/functions/cleanup-expired-accounts/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabaseClient.rpc('disable_expired_accounts')

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      disabled_count: data,
      timestamp: new Date().toISOString()
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

Then set up a cron job in Supabase Dashboard:
- Go to Edge Functions → Create new cron job
- Schedule: `0 0 * * *` (daily at midnight)
- Function: `cleanup-expired-accounts`

### Option 2: External Cron Job
Use a service like GitHub Actions, Vercel Cron, or cron-job.org to call your API endpoint daily.

### Option 3: Manual Cleanup
Run this SQL query manually in Supabase SQL Editor when needed:

```sql
SELECT disable_expired_accounts();
```

## UI Integration

### Display Expiration Badge
Use the `AccountExpirationBadge` component to show expiration status:

```tsx
import { AccountExpirationBadge } from '@/components/AccountExpirationBadge'

<AccountExpirationBadge
  userId={user.id}
  expiresAt={user.account_expires_at}
  durationDays={user.account_duration_days}
  role={user.role}
  showExtendButton={isAdmin}
  onExtended={() => fetchUsers()}
/>
```

### Show Expiration in User Management
The badge will display:
- "Permanent" for admin/developer/instructor
- "X days left" for active accounts
- "Expires in X days" (yellow) when < 7 days remain
- "Expired" (red) when past expiration date

## Database Maintenance

### Check Expiration Statistics
```sql
SELECT 
  role,
  COUNT(*) as total_users,
  COUNT(account_expires_at) as expiring_users,
  COUNT(CASE WHEN account_expires_at < NOW() THEN 1 END) as expired_users,
  COUNT(CASE WHEN account_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' THEN 1 END) as expiring_soon
FROM profiles
GROUP BY role
ORDER BY role;
```

### Delete Expired Accounts (Permanent)
⚠️ WARNING: This permanently deletes data!

```sql
-- Delete accounts expired for more than 90 days
DELETE FROM profiles
WHERE account_expires_at < NOW() - INTERVAL '90 days'
  AND status = 'inactive';
```

## Notifications (Optional Enhancement)

You can add email notifications for expiring accounts:

1. Create a function to get users expiring in 7 days
2. Send them an email reminder
3. Run this daily via cron job

```sql
-- Get users to notify (expiring in 7 days)
SELECT email, first_name, last_name, account_expires_at
FROM profiles
WHERE account_expires_at BETWEEN NOW() + INTERVAL '6 days' AND NOW() + INTERVAL '8 days'
  AND status = 'active';
```

## Benefits

1. **Prevents Database Bloat**: Automatically removes inactive guest accounts
2. **Cost Management**: Reduces storage costs by limiting account lifespans
3. **Security**: Expired accounts are automatically disabled
4. **Flexibility**: Admins can extend accounts as needed
5. **Transparency**: Users can see when their account expires

## Migration Notes

- Existing users get expiration dates set based on their current role
- Guest accounts: 30 days from migration date
- Student accounts: 1 year from migration date
- Scholar accounts: 2 years from migration date
- Admin/Developer/Instructor: No expiration

You may want to adjust these dates for existing users based on their account age.
