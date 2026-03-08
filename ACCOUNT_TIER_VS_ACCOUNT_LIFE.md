# Account Tier vs Account Life - Complete Guide

## Overview
Your system now has TWO separate account management systems that work independently:

---

## 1. Account Tier (Total Lifespan from Creation)

### What it is:
Account Tier determines the TOTAL lifespan of an account from the moment it's created, regardless of user activity.

### How it works:
- Timer starts when account is created
- Counts down based on tier duration
- Does NOT reset when user logs in
- Automatic deletion when timer reaches zero (except VIP)

### Tier Durations:
| Tier | Duration | Description |
|------|----------|-------------|
| Visitor | 3 days | Trial access |
| Beginner | 7 days | Short-term access |
| Intermediate | 25 days | Medium-term access |
| Expert | 30 days | Long-term access |
| VIP | Permanent | Never expires |

### Example:
- User created on March 1st with "Beginner" tier
- Account expires on March 8th (7 days later)
- Even if user logs in every day, account still expires on March 8th
- VIP users never expire

---

## 2. Account Life (Inactivity Threshold)

### What it is:
Account Life tracks user activity and deletes accounts that haven't logged in for 3 days.

### How it works:
- Timer starts from LAST LOGIN
- Resets every time user logs in
- 3-day countdown from last login
- Automatic deletion after 3 days of inactivity

### Rules:
- All tiers (except VIP): Must login every 3 days
- VIP users: Exempt from inactivity deletion
- Developer role: Protected from auto-deletion
- Timer resets on each login

### Example:
- User logs in on March 1st
- Must login again before March 4th (3 days later)
- If they login on March 3rd, timer resets to March 6th
- If they don't login by March 4th, account is deleted
- VIP users show "No limit" instead of countdown

---

## Visual Representation

### Table View:
```
| Name | Role | Status | Account Tier | Account Life | Created |
|------|------|--------|--------------|--------------|---------|
| John | Student | Active | Beginner (5d 12h 30m) | 2d 8h 15m left | Mar 1 |
| Jane | Student | Active | Expert (28d 4h 0m) | Never logged in | Mar 5 |
| Bob  | Student | Active | VIP (Permanent) | No limit | Feb 1 |
```

### Card View:
```
┌─────────────────────────────┐
│ John Doe                    │
│ Student • Active            │
│ Tier: Beginner              │
│ Expires: 5d 12h 30m         │
│ Activity: 2d 8h 15m left    │
│ Created: Mar 1, 2026        │
└─────────────────────────────┘
```

---

## Key Differences

| Aspect | Account Tier | Account Life |
|--------|--------------|--------------|
| **Based on** | Creation date | Last login date |
| **Resets?** | No | Yes (on login) |
| **Duration** | Varies by tier (2-30 days) | Fixed 3 days |
| **VIP Status** | Shows "Permanent" | Shows "No limit" |
| **Purpose** | Total account lifespan | Activity monitoring |
| **Column** | Account Tier | Account Life |

---

## Implementation Status

### ✅ Completed:
1. Account Tier system with 5 tiers
2. Account Life tracking with 3-day threshold
3. Separate columns in table view
4. Separate badges in card view
5. Real-time countdowns for both systems
6. VIP exemptions for both systems
7. Developer protection from auto-deletion
8. Last login tracking in AuthContext

### ⚠️ Pending:
1. **SQL Migration Required**: Run `add_last_login_tracking.sql` in Supabase SQL Editor
   - This adds the `last_login_at` column
   - Sets all existing users to NOW()
   - Creates the `update_last_login()` function
   - Creates the `delete_inactive_login_accounts()` function

---

## Next Steps

1. **Run the SQL migration**:
   - Open Supabase Dashboard
   - Go to SQL Editor
   - Copy contents of `add_last_login_tracking.sql`
   - Execute the script

2. **Verify the implementation**:
   - Check User Management page
   - Confirm "Account Tier" column shows tier badge + expiration countdown
   - Confirm "Account Life" column shows inactivity countdown
   - Verify VIP users show "Permanent" and "No limit"
   - Test login to see if countdown resets

3. **Test scenarios**:
   - Create a new user → Should show "Never logged in" in Account Life
   - Login as that user → Should show 3-day countdown
   - Wait and check if countdown updates in real-time
   - Verify VIP users are exempt from both countdowns

---

## Database Functions

### `update_last_login(p_user_id UUID)`
- Called automatically on user signin
- Updates `last_login_at` to current timestamp
- Resets the 3-day inactivity countdown

### `delete_inactive_login_accounts()`
- Should be called periodically (e.g., daily cron job)
- Deletes accounts with no login for 3+ days
- Protects developers from deletion
- Returns count and list of deleted users

---

## Color Coding

### Account Tier Countdown:
- Blue: More than 1 day remaining
- Yellow: Less than 24 hours
- Red: Expired

### Account Life Countdown:
- Green: More than 1 day remaining
- Yellow: Less than 24 hours (with clock icon)
- Red: Less than 1 hour (pulsing animation)

---

## Summary

- **Account Tier** = How long the account exists (total lifespan)
- **Account Life** = How long since last login (activity monitoring)
- Both systems work independently
- VIP users are exempt from both
- Developers are protected from auto-deletion
