-- Re-run backfill to populate schedule_enrollments
-- The matching logic is confirmed correct from diagnostics

-- Clear existing student enrollments (keep instructor ones)
DELETE FROM schedule_enrollments WHERE role = 'student';

-- Re-enroll all students
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM course_schedules LOOP
    PERFORM auto_enroll_students_to_schedule(r.id);
  END LOOP;
END $$;

-- Verify results
SELECT 
  se.schedule_id,
  cs.title as schedule_title,
  p.first_name,
  p.last_name,
  p.grade,
  p.section,
  se.role
FROM schedule_enrollments se
JOIN profiles p ON p.id = se.user_id
JOIN course_schedules cs ON cs.id = se.schedule_id
ORDER BY cs.title;
