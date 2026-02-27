# Module Content Type Update

## Summary
Updated the module content type system to distinguish between online documents and PDF uploads.

## Changes Made

### 1. Database Schema (Migration 063)
- Updated `content_type` constraint in `modules` table
- Old values: `'video', 'text', 'online_conference', 'document', 'canva_presentation'`
- New values: `'video', 'text', 'online_conference', 'online_document', 'pdf_document', 'canva_presentation'`

### 2. TypeScript Interfaces
Updated in `CourseManagementPage.tsx`:
- `CourseModule` interface
- `NewCourseModule` interface

### 3. UI Changes
Updated dropdown options in both Add and Edit Module modals:
- Changed "Document" → "Online Document" (value: `online_document`)
- Added new "Document" option for PDF uploads (value: `pdf_document`)

### 4. Form Fields
- **Online Document**: Shows URL input field for Google Docs, online PDFs, etc.
- **Document (PDF)**: Shows file upload input for PDF files (max 10MB)

## Files Modified
1. `supabase/migrations/063_add_online_document_type.sql` - New migration
2. `run_migration_063.sql` - Migration runner script
3. `src/components/pages/CourseManagementPage.tsx` - UI and logic updates

## Next Steps

### IMPORTANT: Run the Migration
You MUST run the migration before the changes will work:

1. Open Supabase SQL Editor
2. Copy and paste the contents of `run_migration_063.sql`
3. Execute the SQL

### Testing
After running the migration:
1. Go to Course Management
2. Try creating a new module
3. Select "Online Document" - should show URL input
4. Select "Document" - should show PDF file upload

## Notes
- PDF upload currently stores only the filename
- For production, you'll need to implement actual file storage (Supabase Storage or similar)
- The file upload has a 10MB size limit
- Only PDF files are accepted (.pdf, application/pdf)
