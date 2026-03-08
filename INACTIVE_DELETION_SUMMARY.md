# Inactive Account Auto-Deletion - Implementation Summary

## Overview
Inactive accounts (except Developers) are automatically deleted after 3 days.

## Policy

| Status | Role | Action |
|--------|------|--------|
| Inactive | Developer | **Protected** - Never deleted |
| Inactive | All others | **Deleted after 3 days** |
| Active | Any | Safe - Never deleted |

## Installation

### Step 1: Run Database Migration
```bash
# In Supabase SQL Editor
add_inactive_account_deletion.sql
```

### Step 2: Set Up Daily Cleanup (Choose One)

#### Option A: Supabase Edge Function
Create `supabase/functions/cleanup-inactive-accounts/index.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabaseClient
    .rpc('delete_old_inactive_accounts')

  return new Response(JSON.stringify({ 
    success: !error, 
    result: data 
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Schedule: `0 2 * * *` (daily at 2 AM)

#### Option B: Manual SQL
Run daily in Supabase SQL Editor:
```sql
SELECT delete_old_inactive_accounts();
```

## UI Features Added

### Table View
- Deletion warning badges in "Account Life" column
- Shows countdown for inactive accounts
- Stacked display (expiration + deletion warning)

### Card View
- Deletion warning badges with other status badges
- Color-coded urgency indicators
- Automatic wrapping with other badges

### Badge Colors
- 🔴 Red: "⚠️ Pending Deletion" (ready to delete)
- 🟠 Orange: "⏰ Deletes in Xh" (< 24 hours)
- 🟡 Yellow: "Deletes in Xd" (< 3 days)

## How It Works

### 1. Status Change Tracking
```sql
-- When account becomes inactive
UPDATE profiles SET status = 'inactive';
-- Trigger automatically sets: inactive_since = NOW()
```

### 2. Countdown Begins
- Day 0: Account marked inactive
- Day 1: 2 days until deletion
- Day 2: 1 day until deletion
- Day 3: Account deleted (if still inactive)

### 3. Protection
- Developer accounts: Never deleted
- Reactivated accounts: Countdown cancelled

## Database Functions

### Delete Old Inactive Accounts
```sql
SELECT delete_old_inactive_accounts();
```
Returns:
- Count of deleted accounts
- List of deleted users
- Timestamp

### Get Accounts Pending Deletion
```sql
-- Next 24 hours
SELECT * FROM get_accounts_pending_deletion(24);

-- Next 48 hours
SELECT * FROM get_accounts_pending_deletion(48);
```

### Prevent Deletion (Reactivate)
```sql
SELECT prevent_account_deletion('user-id');
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
    CASE 
        WHEN role = 'developer' THEN 'Protected'
        WHEN inactive_since < NOW() - INTERVAL '3 days' THEN 'Ready for deletion'
        ELSE EXTRACT(DAY FROM ((inactive_since + INTERVAL '3 days') - NOW()))::TEXT || ' days until deletion'
    END as status
FROM profiles
WHERE status = 'inactive'
ORDER BY inactive_since ASC;
```

### Deletion Statistics
```sql
SELECT 
    CASE 
        WHEN role = 'developer' THEN 'Protected'
        WHEN inactive_since < NOW() - INTERVAL '3 days' THEN 'Ready'
        ELSE 'Pending'
    END as deletion_status,
    COUNT(*) as count
FROM profiles
WHERE status = 'inactive'
GROUP BY deletion_status;
```

## Files Created

1. `add_inactive_account_deletion.sql` - Database migration
2. `INACTIVE_ACCOUNT_DELETION_GUIDE.md` - Complete documentation
3. `INACTIVE_DELETION_SUMMARY.md` - This file

## Files Modified

1. `src/components/pages/UserManagementPage.tsx`
   - Added `inactive_since` to UserData interface
   - Added deletion warning badges in table view
   - Added deletion warning badges in card view

## Testing

### Test Deletion
```sql
-- Create test account
INSERT INTO profiles (id, email, first_name, last_name, role, status, password_hash, created_at, updated_at)
VALUES (gen_random_uuid(), 'test@example.com', 'Test', 'User', 'guest', 'inactive', 'dummy', NOW(), NOW());

-- Set as inactive 3+ days ago
UPDATE profiles 
SET inactive_since = NOW() - INTERVAL '3 days 1 hour'
WHERE email = 'test@example.com';

-- Run deletion
SELECT delete_old_inactive_accounts();

-- Verify deleted
SELECT * FROM profiles WHERE email = 'test@example.com';
```

### Test Developer Protection
```sql
-- Create developer
INSERT INTO profiles (id, email, first_name, last_name, role, status, password_hash, created_at, updated_at)
VALUES (gen_random_uuid(), 'dev@example.com', 'Dev', 'User', 'developer', 'inactive', 'dummy', NOW(), NOW());

-- Set as inactive 10 days ago
UPDATE profiles 
SET inactive_since = NOW() - INTERVAL '10 days'
WHERE email = 'dev@example.com';

-- Try to delete
SELECT delete_old_inactive_accounts();

-- Verify still exists
SELECT * FROM profiles WHERE email = 'dev@example.com';
-- Should return the developer account
```

## Benefits

1. **Automatic Cleanup**
   - No manual intervention needed
   - Runs daily via cron job

2. **Database Hygiene**
   - Removes abandoned accounts
   - Reduces storage costs

3. **Security**
   - Removes inactive accounts
   - Reduces attack surface

4. **Developer Safety**
   - Critical accounts protected
   - No accidental deletion

5. **User Awareness**
   - Visual warnings in UI
   - Clear countdown display

## Important Notes

### Grace Period
- 3 days gives time to notice and reactivate
- Warnings appear immediately when inactive
- Countdown is visible to admins

### Permanent Deletion
- After 3 days, deletion is automatic
- Data cannot be recovered
- Consider backups if needed

### Developer Protection
- Developers never auto-deleted
- Even if inactive for years
- Prevents loss of admin access

## Rollback

To disable:
```sql
DROP TRIGGER IF EXISTS track_inactive_status_trigger ON profiles;
DROP FUNCTION IF EXISTS track_inactive_status();
DROP FUNCTION IF EXISTS delete_old_inactive_accounts();
DROP FUNCTION IF EXISTS get_accounts_pending_deletion(INTEGER);
DROP FUNCTION IF EXISTS prevent_account_deletion(UUID);
ALTER TABLE profiles DROP COLUMN IF EXISTS inactive_since;
```

## Next Steps

1. Run `add_inactive_account_deletion.sql`
2. Set up daily cron job
3. Test with non-developer account
4. Monitor deletion logs
5. Refresh browser to see UI warnings
