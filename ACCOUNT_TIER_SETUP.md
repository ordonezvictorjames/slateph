# Account Tier System - Quick Setup Guide

## Overview
Added a 5-tier account system with customizable durations in the Edit User modal.

## Account Tiers

| Tier | Duration | Description |
|------|----------|-------------|
| **Visitor** | 3 days | Trial/temporary access |
| **Beginner** | 7 days | Short-term users |
| **Intermediate** | 25 days | Medium-term users |
| **Expert** | 30 days | Standard users |
| **VIP** | Permanent | Premium/permanent access |

## Installation

### Step 1: Run Database Migration
In Supabase SQL Editor, run:
```bash
add_account_tier_system.sql
```

This will:
- Create `account_tier` enum type
- Add `account_tier` column to profiles table
- Create `update_account_tier()` function
- Update existing users with appropriate tiers
- Modify triggers to use tier system

### Step 2: Restart Dev Server
The TypeScript types and UI components are already updated. Just restart:
```bash
npm run dev
```

## Features

### 1. Edit User Modal
- New "Account Tier" dropdown added below "Role" field
- Shows duration for each tier
- Automatically recalculates expiration when tier changes

### 2. Automatic Expiration Calculation
When you change a user's tier:
- Visitor: Account expires in 3 days from now
- Beginner: Account expires in 7 days from now
- Intermediate: Account expires in 25 days from now
- Expert: Account expires in 30 days from now
- VIP: Account never expires (permanent)

### 3. Database Function
```sql
-- Update user tier (automatically recalculates expiration)
SELECT update_account_tier('user-id-here', 'expert');
```

## Usage

### Change User Tier
1. Go to User Management page
2. Click "Edit" on any user
3. Select new tier from "Account Tier" dropdown
4. Click "Update User"
5. Expiration date is automatically recalculated

### Check User Tier
```sql
SELECT 
  first_name, 
  last_name, 
  account_tier,
  account_duration_days,
  account_expires_at
FROM profiles
WHERE id = 'user-id-here';
```

## Integration with Existing System

This tier system works alongside the role-based durations:
- **Roles** (Admin, Developer, etc.) determine permissions
- **Tiers** (Visitor, Beginner, etc.) determine account duration

You can have:
- A "Student" role with "VIP" tier (permanent student account)
- A "Guest" role with "Visitor" tier (2-day trial)
- An "Instructor" role with "Expert" tier (30-day contract)

## Default Tier Assignment

When creating new accounts:
- Guest role → Visitor tier (3 days)
- Student role → Expert tier (30 days)
- Scholar role → VIP tier (permanent)
- Admin/Developer/Instructor → VIP tier (permanent)

Admins can change these defaults in the Edit User modal.

## Benefits

1. **Flexible Duration Management**
   - Not tied to user roles
   - Easy to upgrade/downgrade
   - Clear tier progression

2. **Trial Accounts**
   - Visitor tier for 2-day trials
   - Automatically expires if not upgraded

3. **Subscription-Like System**
   - Beginner → Intermediate → Expert → VIP
   - Natural upgrade path

4. **Admin Control**
   - Change tier anytime
   - Instant expiration recalculation
   - No manual date entry needed

## Files Modified

1. `add_account_tier_system.sql` - Database migration
2. `src/types/index.ts` - Added AccountTier type
3. `src/components/UserModals.tsx` - Added tier dropdown
4. `src/components/pages/UserManagementPage.tsx` - Added tier handling

## Testing

1. Run the SQL migration
2. Edit any user in User Management
3. Change their tier from dropdown
4. Save and verify expiration date updated
5. Check with: `SELECT * FROM profiles WHERE id = 'user-id'`

## Rollback

If needed, remove the tier system:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS set_account_expiration_trigger ON profiles;

-- Remove functions
DROP FUNCTION IF EXISTS update_account_tier(UUID, account_tier);
DROP FUNCTION IF EXISTS get_tier_duration(account_tier);

-- Remove column
ALTER TABLE profiles DROP COLUMN IF EXISTS account_tier;

-- Remove type
DROP TYPE IF EXISTS account_tier;
```

## Future Enhancements

1. **Tier Badges** - Visual indicators in user list
2. **Bulk Tier Updates** - Change multiple users at once
3. **Tier History** - Track tier changes over time
4. **Auto-Upgrade** - Promote users based on activity
5. **Tier Limits** - Max users per tier
