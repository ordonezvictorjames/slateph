-- ============================================================
-- STEP 1: Check what the JHS student profile actually stores
-- ============================================================
SELECT 
  id,
  first_name,
  last_name,
  role,
  grade,
  section,
  strand,
  batch_number,
  pg_typeof(grade) as grade_type,
  pg_typeof(section) as section_type
FROM profiles
WHERE role = 'jhs_student'
LIMIT 10;

-- ============================================================
-- STEP 2: Check what the schedule stores
-- ============================================================
SELECT 
  id,
  title,
  enrollment_type,
  grade,
  section,
  strand,
  batch,
  pg_typeof(grade) as grade_type,
  pg_typeof(section) as section_type
FROM course_schedules
WHERE enrollment_type = 'jhs_student'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- STEP 3: Check what schedule_enrollments currently has
-- ============================================================
SELECT 
  se.*,
  p.first_name,
  p.last_name,
  p.role,
  p.grade as profile_grade,
  p.section as profile_section
FROM schedule_enrollments se
JOIN profiles p ON p.id = se.user_id
LIMIT 20;

-- ============================================================
-- STEP 4: Simulate the matching logic manually
-- (shows which students WOULD match which schedules)
-- ============================================================
SELECT 
  p.id as profile_id,
  p.first_name,
  p.last_name,
  p.grade as profile_grade,
  p.section as profile_section,
  cs.id as schedule_id,
  cs.title as schedule_title,
  cs.grade as schedule_grade,
  cs.section as schedule_section,
  -- normalized values
  REGEXP_REPLACE(CAST(p.grade AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') as norm_profile_grade,
  REGEXP_REPLACE(CAST(p.section AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') as norm_profile_section,
  REGEXP_REPLACE(CAST(cs.grade AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') as norm_sched_grade,
  REGEXP_REPLACE(CAST(cs.section AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') as norm_sched_section,
  -- does it match?
  (REGEXP_REPLACE(CAST(p.grade AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') = 
   REGEXP_REPLACE(CAST(cs.grade AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i')) as grade_matches,
  (REGEXP_REPLACE(CAST(p.section AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i') = 
   REGEXP_REPLACE(CAST(cs.section AS TEXT), '^(Grade|Section|Batch)\s+', '', 'i')) as section_matches
FROM profiles p
CROSS JOIN course_schedules cs
WHERE p.role = 'jhs_student'
  AND cs.enrollment_type = 'jhs_student'
LIMIT 20;
