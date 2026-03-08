-- Step-by-step fix for enrollment_type constraint issue

-- STEP 1: Check what enrollment_type values currently exist in subjects
SELECT DISTINCT enrollment_type, COUNT(*) as count
FROM subjects
GROUP BY enrollment_type
ORDER BY enrollment_type;

-- STEP 2: Check what enrollment_type values currently exist in courses
SELECT DISTINCT enrollment_type, COUNT(*) as count
FROM courses
GROUP BY enrollment_type
ORDER BY enrollment_type;

-- STEP 3: Drop the existing constraints (they're blocking us)
ALTER TABLE subjects 
DROP CONSTRAINT IF EXISTS subjects_enrollment_type_check;

ALTER TABLE courses 
DROP CONSTRAINT IF EXISTS courses_enrollment_type_check;

-- STEP 4: Update any NULL or invalid values to 'trainee' (default)
UPDATE subjects
SET enrollment_type = 'trainee'
WHERE enrollment_type IS NULL 
   OR enrollment_type NOT IN ('trainee', 'tesda_scholar', 'both');

UPDATE courses
SET enrollment_type = 'trainee'
WHERE enrollment_type IS NULL 
   OR enrollment_type NOT IN ('trainee', 'tesda_scholar', 'both');

-- STEP 5: Now add the constraints back with correct values
ALTER TABLE subjects
ADD CONSTRAINT subjects_enrollment_type_check 
CHECK (enrollment_type IN ('trainee', 'tesda_scholar', 'both'));

ALTER TABLE courses
ADD CONSTRAINT courses_enrollment_type_check 
CHECK (enrollment_type IN ('trainee', 'tesda_scholar', 'both'));

-- STEP 6: Verify the fix
SELECT 
    'subjects' as table_name,
    enrollment_type::text,
    COUNT(*) as count
FROM subjects
GROUP BY enrollment_type
UNION ALL
SELECT 
    'courses' as table_name,
    enrollment_type::text,
    COUNT(*) as count
FROM courses
GROUP BY enrollment_type
ORDER BY table_name, enrollment_type;

-- STEP 7: Verify constraints are in place
SELECT 
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname IN ('subjects_enrollment_type_check', 'courses_enrollment_type_check')
ORDER BY table_name;
