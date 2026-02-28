-- Check current storage buckets and their public status
SELECT id, name, public 
FROM storage.buckets;

-- Make the documents bucket public if it exists
UPDATE storage.buckets 
SET public = true 
WHERE name = 'documents';

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access to Documents" ON storage.objects;

-- Create a policy to allow public read access to documents
CREATE POLICY "Public Access to Documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Verify the changes
SELECT id, name, public 
FROM storage.buckets 
WHERE name = 'documents';
