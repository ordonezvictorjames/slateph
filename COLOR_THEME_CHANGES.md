# Color Theme Update - Kale Green Theme

## Color Scheme (60-30-10 Rule)
- 60% White (#ffffff) - backgrounds, cards
- 30% Kale Green (#588157) - primary buttons, highlights, active states
- 10% Dark Green (#3a5a40) - hover states, accents

## Changes Needed

### 1. Button Colors
Replace all instances of:
- `bg-black` → `bg-[#588157]`
- `hover:bg-gray-800` → `hover:bg-[#3a5a40]`
- `bg-blue-600` → `bg-[#588157]`
- `hover:bg-blue-700` → `hover:bg-[#3a5a40]`
- `#3b82f6` → `#588157`
- `#2563eb` → `#3a5a40`

### 2. Text Colors
- `text-blue-600` → `text-[#588157]`
- `text-blue-700` → `text-[#3a5a40]`

### 3. Background Colors
- `bg-blue-50` → `bg-[#588157]/10`
- `bg-blue-100` → `bg-[#588157]/20`
- `hover:bg-blue-100` → `hover:bg-[#588157]/30`

### 4. Border Colors
- `border-blue-300` → `border-[#588157]`
- `border-black` → `border-[#588157]`

### 5. Icon/Badge Colors
Keep status colors (green for success, red for error, yellow for warning)
Change blue badges to kale green

## Files to Update
- src/components/pages/DashboardHome.tsx ✓ (getButtonBg updated)
- src/components/pages/CourseManagementPage.tsx ✓ (getButtonBg updated)
- src/components/pages/MyCoursesPage.tsx
- src/components/pages/UserManagementPage.tsx
- src/components/pages/SettingsPage.tsx
- src/components/Sidebar.tsx
- src/components/Dashboard.tsx
- All other page components

## Implementation Strategy
1. Update getButtonBg() functions (DONE)
2. Replace hardcoded bg-black classes
3. Replace blue color classes
4. Update inline styles
5. Test all user types
