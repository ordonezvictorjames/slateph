# Online Class Link Feature

## Overview
Added online class link functionality to subjects, allowing admins and developers to add Google Meet, Zoom, or other online class links. All users (students, instructors, admins, developers) can see and access these links from the subject cards.

## Changes Made

### 1. Database Migration
- **File**: `supabase/migrations/073_add_online_class_link_to_subjects.sql`
- Added `online_class_link` column to the `subjects` table
- Column type: TEXT (nullable)

### 2. TypeScript Interfaces
- **File**: `src/components/pages/CourseManagementPage.tsx`
- Updated `Subject` interface to include `online_class_link?: string`
- Updated `NewSubject` interface to include `online_class_link?: string`

### 3. Add Subject Modal
- Added "Online Class Link" input field
- Type: URL input with validation
- Placeholder: "https://meet.google.com/... or https://zoom.us/..."
- Helper text: "Add Google Meet, Zoom, or other online class link"
- Field is optional

### 4. Edit Subject Modal
- Added same "Online Class Link" input field
- Pre-populates with existing link when editing
- Field is optional

### 5. Subject Cards Display
- Added visual indicator (video camera icon) for subjects with online class links
- "Join Online Class" clickable link that opens in new tab
- Link is visible to all user roles (admin, developer, instructor, trainee, tesda_scholar)
- Link opens with `target="_blank"` and `rel="noopener noreferrer"` for security

### 6. Backend Integration
- `handleAddSubject`: Includes `online_class_link` in insert operation
- `handleUpdateSubject`: Includes `online_class_link` in update operation
- `handleEditSubject`: Loads existing `online_class_link` into form

## User Experience

### For Admins/Developers:
1. When creating a new subject, they can add an online class link
2. When editing a subject, they can add/update/remove the online class link
3. The link field accepts any valid URL format

### For All Users (Including Students/Instructors):
1. Subject cards display a "Join Online Class" link with a video camera icon
2. Clicking the link opens the online class in a new tab
3. Link is only shown if the subject has an online class link configured

## Technical Details

- **Input Validation**: Uses HTML5 URL input type for basic validation
- **Security**: Links open with `noopener noreferrer` to prevent security issues
- **Accessibility**: Proper ARIA labels and semantic HTML
- **Responsive**: Works on all screen sizes
- **Icon**: Video camera SVG icon from Heroicons

## Migration Instructions

To apply this feature to your Supabase database:

```sql
-- Run this in your Supabase SQL editor
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS online_class_link TEXT;

COMMENT ON COLUMN subjects.online_class_link IS 'URL for online class (Google Meet, Zoom, etc.)';
```

## Future Enhancements

Potential improvements:
- Add link validation to check if URL is from supported platforms (Meet, Zoom, Teams)
- Add meeting schedule/time information
- Track link click analytics
- Add calendar integration
- Support multiple meeting links per subject
