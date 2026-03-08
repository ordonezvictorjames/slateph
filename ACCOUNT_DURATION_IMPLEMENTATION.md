# Account Duration Implementation Summary

## Overview
Added automatic account expiration system to manage database capacity and prevent unlimited guest account accumulation.

## Account Durations

| Role | Duration | Auto-Disable |
|------|----------|--------------|
| **Guest** | 30 days | ✅ Yes |
| **Student** | 365 days (1 year) | ✅ Yes |
| **Scholar** | 730 days (2 years) | ✅ Yes |
| **Admin** | Permanent | ❌ No |
| **Developer** | Permanent | ❌ No |
| **Instructor** | Permanent | ❌ No |

## Files Created

### 1. Database Migration
- **`add_account_expiration.sql`** - Complete database setup
  - Adds `account_expires_at` and `account_duration_days` columns
  - Creates trigger to auto-set expiration on account creation
  - Creates helper functions for management
  - Updates existing users with expiration dates

### 2. React Components
- **`src/components/AccountExpirationBadge.tsx`** - Shows expiration status with extend options
- **`src/components/ExpiringAccountsWidget.tsx`** - Dashboard widget showing accounts expiring soon

### 3. Documentation
- **`ACCOUNT_EXPIRATION_GUIDE.md`** - Complete implementation guide

### 4. Type Updates
- **`src/types/index.ts`** - Added expiration fields to Profile interface

## Installation Steps

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor, run:
add_account_expiration.sql
```

This will:
- Add new columns to profiles table
- Set expiration for existing users
- Create all helper functions
- Set up automatic triggers

### Step 2: Set Up Automated Cleanup (Choose One)

#### Option A: Supabase Edge Function (Recommended)
Create a scheduled edge function to run daily:

```typescript
// supabase/functions/cleanup-expired-accounts/index.ts
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabaseClient.rpc('disable_expired_accounts')

  return new Response(
    JSON.stringify({ success: !error, disabled_count: data }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

Schedule in Supabase Dashboard:
- Cron: `0 0 * * *` (daily at midnight)

#### Option B: Manual Cleanup
Run this SQL daily in Supabase SQL Editor:
```sql
SELECT disable_expired_accounts();
```

### Step 3: Add UI Components (Optional)

#### Show Expiration in User Management
```tsx
import { AccountExpirationBadge } from '@/components/AccountExpirationBadge'

// In user list/table
<AccountExpirationBadge
  userId={user.id}
  expiresAt={user.account_expires_at}
  durationDays={user.account_duration_days}
  role={user.role}
  showExtendButton={currentUser.role === 'admin'}
  onExtended={() => refreshUsers()}
/>
```

#### Add Expiring Accounts Widget to Dashboard
```tsx
import { ExpiringAccountsWidget } from '@/components/ExpiringAccountsWidget'

// In admin dashboard
<ExpiringAccountsWidget />
```

## Key Features

### 1. Automatic Expiration
- New accounts automatically get expiration dates based on role
- No manual intervention needed

### 2. Visual Indicators
- Badge shows days remaining
- Color-coded warnings:
  - 🔵 Blue: More than 7 days
  - 🟡 Yellow: 7 days or less
  - 🔴 Red: Expired

### 3. Admin Controls
- Extend accounts by 30 days, 90 days, or 1 year
- View all expiring accounts
- Manual cleanup option

### 4. Database Functions

```sql
-- Disable expired accounts (returns count)
SELECT disable_expired_accounts();

-- Extend account duration
SELECT extend_account_duration('user-id', 30); -- +30 days

-- Get accounts expiring soon
SELECT * FROM get_expiring_accounts(7); -- next 7 days
```

## Benefits

1. **Prevents Database Bloat**
   - Guest accounts auto-expire after 30 days
   - Inactive accounts are automatically disabled

2. **Cost Management**
   - Reduces storage costs
   - Limits database growth

3. **Security**
   - Expired accounts can't log in
   - Automatic cleanup of unused accounts

4. **Flexibility**
   - Admins can extend accounts as needed
   - Different durations per role

5. **Transparency**
   - Users see when their account expires
   - Admins get warnings for expiring accounts

## Monitoring

### Check Expiration Statistics
```sql
SELECT 
  role,
  COUNT(*) as total,
  COUNT(CASE WHEN account_expires_at < NOW() THEN 1 END) as expired,
  COUNT(CASE WHEN account_expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days' THEN 1 END) as expiring_soon
FROM profiles
GROUP BY role;
```

### View All Expiring Accounts
```sql
SELECT 
  first_name, 
  last_name, 
  email, 
  role, 
  account_expires_at,
  EXTRACT(DAY FROM (account_expires_at - NOW())) as days_left
FROM profiles
WHERE account_expires_at IS NOT NULL
  AND account_expires_at > NOW()
ORDER BY account_expires_at ASC;
```

## Permanent Deletion (Optional)

To permanently delete expired accounts after 90 days:

```sql
-- ⚠️ WARNING: This permanently deletes data!
DELETE FROM profiles
WHERE account_expires_at < NOW() - INTERVAL '90 days'
  AND status = 'inactive';
```

## Future Enhancements

1. **Email Notifications**
   - Send reminder 7 days before expiration
   - Send final warning 1 day before

2. **Self-Service Extension**
   - Allow users to request extension
   - Admin approval workflow

3. **Grace Period**
   - Keep account active for 7 days after expiration
   - Allow data export before deletion

4. **Analytics**
   - Track account lifecycle
   - Monitor extension patterns
   - Capacity forecasting

## Testing

1. Create a test guest account
2. Check that `account_expires_at` is set to 30 days from now
3. Manually set expiration to past date
4. Run `SELECT disable_expired_accounts()`
5. Verify account status changed to 'inactive'
6. Test extend function
7. Verify expiration date updated

## Rollback

If you need to remove this feature:

```sql
-- Remove triggers
DROP TRIGGER IF EXISTS set_account_expiration_trigger ON profiles;

-- Remove functions
DROP FUNCTION IF EXISTS set_account_expiration();
DROP FUNCTION IF EXISTS disable_expired_accounts();
DROP FUNCTION IF EXISTS extend_account_duration(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_expiring_accounts(INTEGER);

-- Remove columns (optional - keeps existing data)
ALTER TABLE profiles 
DROP COLUMN IF EXISTS account_expires_at,
DROP COLUMN IF EXISTS account_duration_days;
```

## Support

For issues or questions:
1. Check `ACCOUNT_EXPIRATION_GUIDE.md` for detailed documentation
2. Review SQL functions in `add_account_expiration.sql`
3. Test with a guest account first
