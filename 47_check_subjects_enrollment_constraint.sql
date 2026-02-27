-- Check the enrollment_type constraint on subjects table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'subjects'::regclass
  AND conname LIKE '%enrollment%';
