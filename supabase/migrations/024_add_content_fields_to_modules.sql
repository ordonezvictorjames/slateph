-- Add content fields for different module types
-- This allows storing text content, video URLs, and document URLs

-- Add text_content column for text-based modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Add video_url column for video modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add document_url column for document modules
ALTER TABLE modules ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Add comments for clarity
COMMENT ON COLUMN modules.text_content IS 'Rich text content for text-based modules';
COMMENT ON COLUMN modules.video_url IS 'URL for video content (YouTube, Vimeo, etc.)';
COMMENT ON COLUMN modules.document_url IS 'URL for document files (PDF, Google Docs, etc.)';
