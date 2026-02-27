-- Add conference_url column to modules table for online conference links
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS conference_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN modules.conference_url IS 'URL for online conference (e.g., Google Meet link)';
