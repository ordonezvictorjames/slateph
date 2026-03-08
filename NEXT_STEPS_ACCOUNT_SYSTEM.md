# Next Steps - Account System Implementation

## ✅ What's Already Done

1. **Build Error Fixed**: Changed `'trainee'` to `'student'` in CourseChat.tsx
2. **Code Implementation Complete**:
   - Account Tier column shows tier badge + expiration countdown
   - Account Life column shows inactivity countdown (3 days from last login)
   - Separate columns in table view
   - Separate badges in card view
   - Real-time countdowns with color coding
   - VIP exemptions (shows "Permanent" and "No limit")
   - Developer protection from auto-deletion
   - Last login tracking in AuthContext

## ⚠️ What You Need to Do

### Step 1: Run SQL Migration

The database needs to be updated with the `last_login_at` column and functions.

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Open the file: `add_last_login_tracking.sql`
4. Copy all contents
5. Paste into SQL Editor
6. Click **Run**

This will:
- Add `last_login_at` column to profiles table
- Set all existing users to NOW() (so they have 3 days from now)
- Create `update_last_login()` function (called on signin)
- Create `delete_inactive_login_accounts()` function (for cleanup)

### Step 2: Test the Implementation

1. **Start your local server**:
   ```bash
   npm run dev
   ```

2. **Go to User Management page**

3. **Check the table view**:
   - Should see "Account Tier" column with tier badge + countdown
   - Should see "Account Life" column with inactivity countdown
   - VIP users should show "Permanent" and "No limit"
   - New users (never logged in) should show "Never logged in"

4. **Test login**:
   - Login as a test user
   - Check User Management page
   - Should now show countdown (e.g., "2d 23h 59m left")
   - Countdown should update every second

5. **Test VIP exemption**:
   - Edit a user and set tier to "VIP"
   - Should show "Permanent" in Account Tier column
   - Should show "No limit" in Account Life column

### Step 3: Set Up Automated Cleanup (Optional)

To automatically delete inactive accounts, you need to set up a scheduled job:

**Option A: Supabase Edge Function (Recommended)**
```sql
-- Create a cron job in Supabase
SELECT cron.schedule(
  'delete-inactive-accounts',
  '0 0 * * *', -- Run daily at midnight
  $$
  SELECT delete_inactive_login_accounts();
  $$
);
```

**Option B: External Cron Job**
Set up a daily cron job that calls:
```bash
curl -X POST https://your-project.supabase.co/rest/v1/rpc/delete_inactive_login_accounts \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 📊 Understanding the System

Read `ACCOUNT_TIER_VS_ACCOUNT_LIFE.md` for a complete explanation of:
- How Account Tier works (total lifespan from creation)
- How Account Life works (3-day inactivity threshold)
- Key differences between the two systems
- Visual examples
- Color coding

## 🎯 Quick Reference

### Account Tier (Total Lifespan)
- Visitor: 3 days from creation
- Beginner: 7 days from creation
- Intermediate: 25 days from creation
- Expert: 30 days from creation
- VIP: Permanent (never expires)

### Account Life (Inactivity)
- All tiers: Must login every 3 days
- VIP: Exempt (no limit)
- Developer: Protected from deletion
- Timer resets on each login

## 🐛 Troubleshooting

### "Never logged in" shows for all users
- You haven't run the SQL migration yet
- Run `add_last_login_tracking.sql` in Supabase SQL Editor

### Countdown not updating
- Check browser console for errors
- Verify `last_login_at` column exists in database
- Verify `update_last_login()` function exists

### VIP users showing countdown
- Check that `account_tier` is set to 'vip' (lowercase)
- Verify the conditional logic in UserManagementPage.tsx

## ✨ Current Status

- ✅ Build successful (no TypeScript errors)
- ✅ Code implementation complete
- ⏳ SQL migration pending (you need to run it)
- ⏳ Testing pending (after SQL migration)

Once you run the SQL migration, everything should work perfectly!
