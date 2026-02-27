-- Check current enum values
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'enrollment_type'
ORDER BY e.enumsortorder;

-- Add 'trainee' to the enrollment_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'trainee' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enrollment_type')
    ) THEN
        ALTER TYPE enrollment_type ADD VALUE 'trainee';
    END IF;
END $$;

-- Verify the enum now includes 'trainee'
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'enrollment_type'
ORDER BY e.enumsortorder;
