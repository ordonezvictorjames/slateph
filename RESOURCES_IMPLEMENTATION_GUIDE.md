# Resources Implementation Guide

## Overview
Add resource links functionality that is visible and clickable for trainee and instructor users in the MyCoursesPage.

## Database Schema
✅ Already created: `supabase/migrations/069_create_subject_resources.sql`
- Table: `subject_resources`
- Fields: id, subject_id, title, resource_url, resource_type, description, file_size, file_type, order_index, status
- RLS policies allow all authenticated users to view, admins/developers to manage

## Implementation Steps

### 1. Add Resources Display in Subject Cards (MyCoursesPage.tsx)

Add a resources section below the subject description in the subject card:

```tsx
{/* Resources Section - Show if resources exist */}
{subject.resources && subject.resources.length > 0 && (
  <div className="mt-3 pt-3 border-t border-gray-100">
    <div className="flex items-center gap-2 mb-2">
      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <span className="text-xs font-semibold text-gray-700">Resources</span>
    </div>
    <div className="flex flex-wrap gap-2">
      {subject.resources.map((resource: any) => (
        <a
          key={resource.id}
          href={resource.resource_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span>{resource.title}</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ))}
    </div>
  </div>
)}
```

### 2. Update Subject Fetch Query

Modify the subjects fetch query to include resources:

```tsx
const { data, error } = await supabase
  .from('subjects')
  .select(`
    *,
    trainee:profiles!subjects_trainee_id_fkey(first_name, last_name),
    resources:subject_resources(id, title, resource_url, resource_type, status, order_index)
  `)
  .eq('course_id', selectedCourse.id)
  .eq('subject_resources.status', 'active')
  .order('order_index', { ascending: true })
  .order('order_index', { foreignTable: 'subject_resources', ascending: true })
```

### 3. Update TypeScript Interface

Add resources to the Subject interface in `src/types/index.ts`:

```tsx
export interface Subject {
  id: string
  course_id: string
  title: string
  description?: string
  trainee_id?: string
  order_index: number
  status: 'active' | 'inactive' | 'draft'
  enrollment_type?: string
  created_at?: string
  updated_at?: string
  trainee?: {
    first_name: string
    last_name: string
  }
  trainee_name?: string
  resources?: SubjectResource[]
}

export interface SubjectResource {
  id: string
  subject_id: string
  title: string
  resource_url: string
  resource_type: 'link' | 'file' | 'document'
  description?: string
  file_size?: number
  file_type?: string
  order_index: number
  status: 'active' | 'inactive'
  created_at?: string
  updated_at?: string
}
```

### 4. Admin/Developer Resource Management

The resource management UI is already in place in CourseManagementPage.tsx (subject sidebar).

To make it functional:
- Add state for resource input
- Add handler to save resources to database
- Fetch and display existing resources
- Add delete functionality

## Testing Checklist

- [ ] Run migration: `069_create_subject_resources.sql`
- [ ] Add sample resources via admin interface
- [ ] Login as trainee and verify resources are visible
- [ ] Click resource links and verify they open in new tab
- [ ] Login as instructor and verify resources are visible
- [ ] Verify admins can add/edit/delete resources
- [ ] Test with multiple resources per subject
- [ ] Test with no resources (should not show section)

## Security Notes

- Resources are visible to all authenticated users (RLS policy)
- Only admins and developers can create/update/delete resources
- Links open in new tab with `rel="noopener noreferrer"` for security
- Resource URLs should be validated before saving
