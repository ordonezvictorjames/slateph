-- Update the documents bucket to allow PowerPoint file types

-- First, check current bucket configuration
SELECT id, name, allowed_mime_types, file_size_limit
FROM storage.buckets
WHERE name = 'documents';

-- Update the bucket to allow PowerPoint and other presentation formats
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
]
WHERE name = 'documents';

-- Verify the update
SELECT id, name, allowed_mime_types, file_size_limit
FROM storage.buckets
WHERE name = 'documents';
