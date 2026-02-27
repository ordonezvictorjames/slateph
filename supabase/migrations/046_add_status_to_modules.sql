-- Add status column to modules table
-- This allows tracking module status (active, inactive, draft)

-- Add status column with default value 'active'
ALTER TABLE modules 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'draft'));

-- Add comment for clarity
COMMENT ON COLUMN modules.status IS 'Module status: active, inactive, or draft';

-- Update existing modules to have 'active' status if NULL
UPDATE modules SET status = 'active' WHERE status IS NULL;
