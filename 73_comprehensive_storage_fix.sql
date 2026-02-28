-- Comprehensive fix for documents storage bucket

-- Step 1: Check if bucket exists and its current settings
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE name = 'documents';

-- Step 2: Make the bucket public (if it's not already)
UPDATE storage.buckets
SET public = true
WHERE name = 'documents';

-- Step 3: Drop ALL existing policies for storage.objects
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Step 4: Create simple, permissive policies for documents bucket
-- Allow anyone to upload to documents bucket
CREATE POLICY "Public upload to documents"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'documents');

-- Allow anyone to read from documents bucket
CREATE POLICY "Public read from documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Allow anyone to update documents
CREATE POLICY "Public update documents"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');

-- Allow anyone to delete from documents
CREATE POLICY "Public delete from documents"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'documents');

-- Step 5: Verify the setup
SELECT 
    b.name as bucket_name,
    b.public as is_public,
    b.file_size_limit,
    b.allowed_mime_types
FROM storage.buckets b
WHERE b.name = 'documents';

-- Show all policies for storage.objects
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
