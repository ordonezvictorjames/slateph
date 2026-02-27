-- Drop the old content_type check constraint
ALTER TABLE modules
DROP CONSTRAINT IF EXISTS modules_content_type_check;

-- Add new content_type check constraint with online_document and pdf_document
ALTER TABLE modules
ADD CONSTRAINT modules_content_type_check 
CHECK (content_type IN ('video', 'text', 'online_conference', 'online_document', 'pdf_document', 'canva_presentation'));

-- Add comment
COMMENT ON CONSTRAINT modules_content_type_check ON modules IS 'Ensures content_type is one of: video, text, online_conference, online_document, pdf_document, canva_presentation';
