-- Verify and fix bucket settings for documents bucket
-- Run this in Supabase SQL Editor if PDFs are not loading

-- 1. Check if bucket exists and is public
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'documents';

-- 2. Update bucket to be public if it's not
UPDATE storage.buckets 
SET public = true 
WHERE id = 'documents';

-- 3. Verify the bucket is now public
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'documents';

-- 4. Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' 
AND policyname LIKE '%documents%';

-- Expected output:
-- Bucket should show: public = true
-- Policies should show:
--   - "Allow public read access to documents" (SELECT)
--   - "Allow authenticated users to upload documents" (INSERT)
--   - "Allow authenticated users to update their documents" (UPDATE)
--   - "Allow authenticated users to delete documents" (DELETE)
