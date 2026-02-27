# Instructor Permissions Restriction

## Overview
Restrict instructor account permissions to view-only access for non-assigned courses and remove course/student management capabilities. Instructors should only be able to manage content within their assigned courses.

## User Stories

### 1. As an instructor, I cannot create, edit, or delete courses
**Acceptance Criteria:**
- Instructor cannot access Course Management page
- Instructor cannot see any create/edit/delete buttons for courses
- Instructor can only view courses they are assigned to

### 2. As an instructor, I cannot create, edit, or delete subjects
**Acceptance Criteria:**
- Instructor cannot add new subjects to any course
- Instructor cannot edit subject details
- Instructor cannot delete subjects
- Instructor can only view subjects in their assigned courses

### 3. As an instructor, I cannot create, edit, or delete modules
**Acceptance Criteria:**
- Instructor cannot add new modules to any subject
- Instructor cannot edit module content
- Instructor cannot delete modules
- Instructor can only view modules in their assigned courses

### 4. As an instructor, I cannot enroll or remove students
**Acceptance Criteria:**
- Instructor cannot access student enrollment functions
- Instructor cannot add students to courses
- Instructor cannot remove students from courses
- Instructor can view enrolled students in their assigned courses (read-only)

### 5. As an instructor, I see "My Courses" instead of "Courses" in sidebar
**Acceptance Criteria:**
- Sidebar shows "My Courses" menu item for instructors
- "My Courses" only displays courses where instructor is assigned to subjects
- Remove "Courses" menu item from instructor sidebar
- "My Courses" page shows assigned courses only

### 6. As an instructor, I can request schedule changes
**Acceptance Criteria:**
- Instructor can view schedule
- Instructor can create schedule request (not direct schedule)
- Schedule requests are sent to admin/developer for approval
- Instructor receives notification when request is approved/rejected

### 7. As an instructor, I can see all courses in Dashboard but cannot manage them
**Acceptance Criteria:**
- Dashboard shows all courses in the system (read-only)
- Instructor can only click/manage courses they are assigned to
- Non-assigned courses show "View Only" or are disabled
- Clear visual indication of which courses are assigned vs not assigned

## Technical Requirements

### Sidebar Changes
- Remove "Courses" menu item for instructors
- Keep "My Courses" menu item (already exists for students, extend to instructors)
- Update "My Courses" page to work for both students and instructors

### Course Management
- Hide Course Management page from instructors
- Remove all create/edit/delete buttons from instructor views
- Implement read-only mode for non-assigned courses

### Student Management
- Remove enrollment/unenrollment functions from instructor views
- Keep "My Students" page as read-only view

### Schedule Management
- Create schedule request system
- Add approval workflow for admin/developer
- Add notification system for request status

### Dashboard
- Show all courses but disable management for non-assigned courses
- Add visual indicators for assigned vs non-assigned courses
- Implement click restrictions for non-assigned courses

## Implementation Plan

### Phase 1: Sidebar and Navigation
1. Update Sidebar component to show "My Courses" for instructors
2. Remove "Courses" menu item from instructor navigation
3. Update MyCoursesPage to support instructor role

### Phase 2: Course Management Restrictions
1. Hide Course Management from instructor sidebar
2. Remove create/edit/delete buttons from all course-related pages for instructors
3. Implement read-only mode for course views

### Phase 3: Student Management Restrictions
1. Remove enrollment/unenrollment buttons from instructor views
2. Convert "My Students" page to read-only
3. Remove student management actions

### Phase 4: Schedule Request System
1. Create schedule request database table
2. Create schedule request form for instructors
3. Create approval interface for admins/developers
4. Implement notification system

### Phase 5: Dashboard Updates
1. Update Dashboard to show all courses
2. Add visual indicators for assigned vs non-assigned courses
3. Implement click restrictions and disabled states
4. Add tooltips explaining restrictions

## Database Changes

### New Table: schedule_requests
```sql
- id (uuid, primary key)
- instructor_id (uuid, foreign key to profiles)
- course_id (uuid, foreign key to courses)
- requested_date (date)
- requested_time (time)
- duration_minutes (integer)
- description (text)
- status (enum: pending, approved, rejected)
- reviewed_by (uuid, foreign key to profiles, nullable)
- reviewed_at (timestamp, nullable)
- rejection_reason (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)
```

## UI/UX Considerations

### Visual Indicators
- Assigned courses: Normal appearance with full interaction
- Non-assigned courses: Grayed out or with "View Only" badge
- Disabled buttons: Hidden or grayed out with tooltip explaining restriction

### User Feedback
- Clear messages when instructor tries to access restricted features
- Helpful tooltips explaining why certain actions are unavailable
- Notification system for schedule request status

## Security Considerations
- Implement RLS policies to enforce restrictions at database level
- Add server-side validation for all instructor actions
- Ensure instructors cannot bypass restrictions via API calls

## Testing Requirements
- Test all instructor navigation paths
- Verify instructors cannot access restricted pages
- Test schedule request workflow end-to-end
- Verify dashboard shows correct course states
- Test that instructors can still view their assigned courses normally
