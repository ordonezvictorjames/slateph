-- Direct enrollment insert — bypasses the function entirely
-- Uses the exact same normalization logic confirmed working in diagnostics

-- Step 1: Clear existing student enrollments
DELETE FROM schedule_enrollments WHERE role = 'student';

-- Step 2: Enroll JHS students directly
INSERT INTO schedule_enrollments (schedule_id, user_id, role)
SELECT 
  cs.id AS schedule_id,
  p.id  AS user_id,
  'student' AS role
FROM profiles p
CROSS JOIN course_schedules cs
WHERE p.role = 'jhs_student'
  AND cs.enrollment_type = 'jhs_student'
  AND (
    cs.grade IS NULL OR
    REGEXP_REPLACE(CAST(p.grade AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') =
    REGEXP_REPLACE(CAST(cs.grade AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i')
  )
  AND (
    cs.section IS NULL OR
    REGEXP_REPLACE(CAST(p.section AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') =
    REGEXP_REPLACE(CAST(cs.section AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i')
  )
ON CONFLICT (schedule_id, user_id) DO NOTHING;

-- Step 3: Enroll SHS students directly
INSERT INTO schedule_enrollments (schedule_id, user_id, role)
SELECT 
  cs.id AS schedule_id,
  p.id  AS user_id,
  'student' AS role
FROM profiles p
CROSS JOIN course_schedules cs
WHERE p.role = 'shs_student'
  AND cs.enrollment_type = 'shs_student'
  AND (
    cs.grade IS NULL OR
    REGEXP_REPLACE(CAST(p.grade AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') =
    REGEXP_REPLACE(CAST(cs.grade AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i')
  )
  AND (
    cs.section IS NULL OR
    REGEXP_REPLACE(CAST(p.section AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') =
    REGEXP_REPLACE(CAST(cs.section AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i')
  )
  AND (cs.strand IS NULL OR p.strand = cs.strand)
ON CONFLICT (schedule_id, user_id) DO NOTHING;

-- Step 4: Enroll College students directly
INSERT INTO schedule_enrollments (schedule_id, user_id, role)
SELECT 
  cs.id AS schedule_id,
  p.id  AS user_id,
  'student' AS role
FROM profiles p
CROSS JOIN course_schedules cs
WHERE p.role = 'college_student'
  AND cs.enrollment_type = 'college_student'
  AND (
    cs.section IS NULL OR
    REGEXP_REPLACE(CAST(p.section AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') =
    REGEXP_REPLACE(CAST(cs.section AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i')
  )
ON CONFLICT (schedule_id, user_id) DO NOTHING;

-- Step 5: Enroll TESDA scholars directly
INSERT INTO schedule_enrollments (schedule_id, user_id, role)
SELECT 
  cs.id AS schedule_id,
  p.id  AS user_id,
  'student' AS role
FROM profiles p
CROSS JOIN course_schedules cs
WHERE p.role = 'scholar'
  AND cs.enrollment_type = 'tesda_scholar'
  AND (
    cs.batch IS NULL OR
    REGEXP_REPLACE(CAST(p.batch_number AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') =
    REGEXP_REPLACE(CAST(cs.batch AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i')
  )
ON CONFLICT (schedule_id, user_id) DO NOTHING;

-- Step 6: Verify — should show enrolled students with their schedule
SELECT 
  cs.title AS schedule_title,
  cs.enrollment_type,
  cs.grade AS sched_grade,
  cs.section AS sched_section,
  p.first_name,
  p.last_name,
  p.grade AS profile_grade,
  p.section AS profile_section,
  se.role
FROM schedule_enrollments se
JOIN profiles p ON p.id = se.user_id
JOIN course_schedules cs ON cs.id = se.schedule_id
ORDER BY cs.title, p.last_name;
