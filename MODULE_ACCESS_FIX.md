# Module Access Investigation - RESOLVED

## Problem
Trainee and TESDA scholar users reported they cannot access modules.

## Investigation Results

### Database Analysis
For the enrolled course (ID: `2772e5c3-bf3d-4668-bc54-06f45648fe67`):
- ✅ Trainee has active enrollment
- ✅ Course has 6 subjects (2 active, 4 inactive)
- ✅ Course has 4 modules total

### Module Distribution
| Subject | Status | Modules | Accessible to Trainees |
|---------|--------|---------|------------------------|
| Introduction to Cobot | inactive | 1 | ❌ No |
| Dart Studio | active | 3 | ✅ Yes |
| 4 other subjects | inactive | 0 | ❌ No |

## Root Cause
The system is working as designed. Trainees can only access subjects with `status = 'active'`. 

- **Accessible**: 3 modules in "Dart Studio" (active subject)
- **Not Accessible**: 1 module in "Introduction to Cobot" (inactive subject)

This is intentional behavior implemented in `MyCoursesPage.tsx` line ~160:
```typescript
if (userRole === 'trainee' || userRole === 'tesda_scholar') {
  query = query.eq('status', 'active')
}
```

## Solutions

### Option 1: Activate Inactive Subjects (Recommended)
If trainees should access all subjects, activate them:

```sql
-- Activate specific subject
UPDATE subjects 
SET status = 'active' 
WHERE id = '[subject_id]';

-- Or activate all subjects in the course
UPDATE subjects 
SET status = 'active' 
WHERE course_id = '2772e5c3-bf3d-4668-bc54-06f45648fe67';
```

### Option 2: Remove Status Filter for Trainees
If trainees should see all subjects regardless of status, modify the code:

In `src/components/pages/MyCoursesPage.tsx`, remove or comment out lines ~160-162:
```typescript
// Remove this filter to show all subjects
// if (userRole === 'trainee' || userRole === 'tesda_scholar') {
//   query = query.eq('status', 'active')
// }
```

### Option 3: Use Draft/Preview Mode
Add a "preview" or "draft" mode that allows trainees to see inactive content during development.

## Verification
Trainees should currently be able to access:
- ✅ "Dart Studio" subject with 3 modules
- ❌ "Introduction to Cobot" subject (inactive)

## Recommendation
Activate the "Introduction to Cobot" subject if it's ready for trainees to access. The current behavior is correct - inactive subjects are hidden from trainees by design.

## Related Files
- `src/components/pages/MyCoursesPage.tsx` - Subject filtering logic
- `supabase/migrations/076_debug_subjects_and_modules.sql` - Diagnostic queries
- `supabase/migrations/077_check_module_distribution.sql` - Module distribution analysis
