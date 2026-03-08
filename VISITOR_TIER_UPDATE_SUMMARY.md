# Visitor Tier Updated: 2 Days → 3 Days

## Changes Made

The Visitor tier duration has been updated from 2 days to 3 days.

## Updated Tier Structure

| Tier | Duration | Description |
|------|----------|-------------|
| Visitor | **3 days** ✨ | Trial/temporary access (was 2 days) |
| Beginner | 7 days | Short-term users |
| Intermediate | 25 days | Medium-term users |
| Expert | 30 days | Long-term users |
| VIP | Permanent | Never expires |

## Files Updated

### 1. SQL Files
- ✅ `add_account_tier_system.sql` - Updated function and comments
- ✅ `update_visitor_tier_to_3days.sql` - NEW migration script

### 2. Documentation Files
- ✅ `ACCOUNT_TIER_VS_ACCOUNT_LIFE.md`
- ✅ `ACCOUNT_TIER_SETUP.md`
- ✅ `ACCOUNT_TIER_COLUMNS_UPDATE.md`
- ✅ `NEXT_STEPS_ACCOUNT_SYSTEM.md`

## What You Need to Do

### Run the SQL Migration

Open Supabase SQL Editor and run: `update_visitor_tier_to_3days.sql`

This will:
1. Update the `get_tier_duration()` function to return 3 for visitor tier
2. Update the column comment
3. Update existing visitor tier users to have 3 days duration
4. Recalculate expiration dates for existing visitors

### What Happens to Existing Users

- **Existing Visitor users**: Their duration will be updated to 3 days from their creation date
- **New Visitor users**: Will automatically get 3 days from creation
- **Other tiers**: No changes

## Example

### Before:
- User created on March 1st with Visitor tier
- Account expires on March 3rd (2 days)

### After:
- User created on March 1st with Visitor tier
- Account expires on March 4th (3 days)

## Testing

After running the migration:

1. Check existing Visitor users in User Management
2. Verify they show "3 days" in the Tier Expiration column
3. Create a new user with Visitor tier
4. Confirm they get 3 days duration

## Impact

- More generous trial period for new users
- Better user experience for visitors
- Aligns with 3-day inactivity threshold (Account Life)
- No impact on other tiers

## Status

✅ Code updated
✅ Documentation updated
⏳ SQL migration ready to run
⏳ Testing pending
