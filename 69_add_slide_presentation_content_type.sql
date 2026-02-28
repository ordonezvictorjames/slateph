-- Add 'slide_presentation' to the content_type check constraint in modules table

-- First, check the current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'modules'::regclass 
AND contype = 'c'
AND conname = 'modules_content_type_check';

-- Drop the existing check constraint on content_type
ALTER TABLE modules 
DROP CONSTRAINT IF EXISTS modules_content_type_check;

-- Add new check constraint with slide_presentation included
ALTER TABLE modules
ADD CONSTRAINT modules_content_type_check 
CHECK (content_type = ANY (ARRAY['video'::text, 'text'::text, 'online_conference'::text, 'online_document'::text, 'pdf_document'::text, 'canva_presentation'::text, 'slide_presentation'::text]));

-- Verify the new constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'modules'::regclass 
AND contype = 'c'
AND conname = 'modules_content_type_check';
