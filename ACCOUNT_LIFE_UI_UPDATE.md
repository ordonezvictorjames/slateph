# Account Life UI Update

## Changes Made

Added "Account Life" column/badge to User Management page showing account expiration status.

## Table View (List View)

### New Column: "Account Life"
- Position: Between "Status" and "Created" columns
- Shows account expiration status with color-coded badges

### Badge Colors:
- 🔴 **Red** - Expired accounts
- 🟡 **Yellow** - Expiring soon (≤7 days)
- 🔵 **Blue** - Active with time remaining
- 🟢 **Green** - Permanent accounts (no expiration)

### Display Format:
- Expired: "Expired"
- Active: "Xd left" (e.g., "15d left")
- Permanent: "Permanent"

## Card View

### Account Life Badge
- Added to badge row after status badge
- Same color coding as table view
- Automatically wraps with other badges (role, strand, section, status)

## Visual Examples

### Table View
```
User | Email | Role | Status | Account Life | Created | Actions
John | john@ | Admin | Active | Permanent   | 1/1/24  | Edit Delete
Jane | jane@ | Guest | Active | 2d left     | 3/8/24  | Edit Delete
Bob  | bob@  | Student| Active | 15d left    | 2/1/24  | Edit Delete
```

### Card View
```
┌─────────────────────────────┐
│ 👤 John Doe                 │
│    john@example.com         │
│                             │
│ [Admin] [Active] [Permanent]│
│                             │
│ 📅 Created: Jan 1, 2024     │
│ [Edit] [Delete]             │
└─────────────────────────────┘
```

## Calculation Logic

```typescript
const expirationDate = new Date(account_expires_at)
const now = new Date()
const daysLeft = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24))

if (daysLeft < 0) {
  // Expired - Red badge
} else if (daysLeft <= 7) {
  // Expiring soon - Yellow badge
} else {
  // Active - Blue badge
}
```

## Benefits

1. **At-a-Glance Status**
   - Admins can quickly see which accounts are expiring
   - Color coding makes urgent accounts stand out

2. **Proactive Management**
   - Yellow badges warn of accounts expiring within 7 days
   - Admins can extend accounts before they expire

3. **Clear Differentiation**
   - Permanent accounts clearly marked
   - Temporary accounts show exact days remaining

4. **Consistent Display**
   - Same information in both table and card views
   - Responsive design works on all screen sizes

## Files Modified

- `src/components/pages/UserManagementPage.tsx`
  - Added "Account Life" column header
  - Added account life cell in table rows
  - Added account life badge in card view
  - Updated colspan from 6 to 7 for empty states

## Testing

1. View User Management page in table view
2. Check "Account Life" column appears
3. Verify color coding:
   - Permanent accounts show green "Permanent"
   - Active accounts show blue "Xd left"
   - Expiring accounts (≤7 days) show yellow
   - Expired accounts show red "Expired"
4. Switch to card view
5. Verify account life badge appears in each card
6. Test with different account tiers (Visitor, Beginner, Expert, VIP)

## Future Enhancements

1. **Sortable Column**
   - Click to sort by expiration date
   - Group expired accounts together

2. **Filter by Expiration**
   - Show only expiring accounts
   - Show only expired accounts
   - Show only permanent accounts

3. **Bulk Actions**
   - Extend multiple accounts at once
   - Delete all expired accounts

4. **Hover Details**
   - Show exact expiration date on hover
   - Show account tier on hover

5. **Export**
   - Export list of expiring accounts
   - Generate expiration report
