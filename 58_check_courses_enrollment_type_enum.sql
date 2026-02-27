-- Check the enrollment_type constraint on courses table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'courses'::regclass
  AND conname LIKE '%enrollment%';

-- Also check if it's an enum type
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%enrollment%'
ORDER BY e.enumsortorder;
