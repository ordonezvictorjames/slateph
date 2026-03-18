-- Schedule Enrollments System
-- Run this in your Supabase SQL editor

-- 1. Create schedule_enrollments table
CREATE TABLE IF NOT EXISTS schedule_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id   UUID NOT NULL REFERENCES course_schedules(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor')),
  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(schedule_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_enrollments_schedule ON schedule_enrollments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_enrollments_user    ON schedule_enrollments(user_id);

-- 2. Enable RLS
ALTER TABLE schedule_enrollments ENABLE ROW LEVEL SECURITY;

-- Admins/developers can do everything
CREATE POLICY "admins_manage_schedule_enrollments" ON schedule_enrollments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'developer')
    )
  );

-- Users can read their own enrollments
CREATE POLICY "users_read_own_schedule_enrollments" ON schedule_enrollments
  FOR SELECT USING (user_id = auth.uid());

-- 3. Function: auto-enroll students into a schedule based on class match
CREATE OR REPLACE FUNCTION auto_enroll_students_to_schedule(p_schedule_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_schedule    RECORD;
  v_count       INTEGER := 0;
BEGIN
  SELECT * INTO v_schedule FROM course_schedules WHERE id = p_schedule_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- JHS: match enrollment_type + grade + section
  IF v_schedule.enrollment_type = 'jhs_student' THEN
    INSERT INTO schedule_enrollments (schedule_id, user_id, role)
    SELECT p_schedule_id, p.id, 'student'
    FROM profiles p
    WHERE p.role = 'jhs_student'
      AND (v_schedule.grade   IS NULL OR CAST(p.grade AS TEXT) = REPLACE(v_schedule.grade, 'Grade ', ''))
      AND (v_schedule.section IS NULL OR CAST(p.section AS TEXT) = REPLACE(v_schedule.section, 'Section ', ''))
    ON CONFLICT (schedule_id, user_id) DO NOTHING;

  -- SHS: match enrollment_type + grade + section + strand
  ELSIF v_schedule.enrollment_type = 'shs_student' THEN
    INSERT INTO schedule_enrollments (schedule_id, user_id, role)
    SELECT p_schedule_id, p.id, 'student'
    FROM profiles p
    WHERE p.role = 'shs_student'
      AND (v_schedule.grade   IS NULL OR CAST(p.grade AS TEXT) = REPLACE(v_schedule.grade, 'Grade ', ''))
      AND (v_schedule.section IS NULL OR CAST(p.section AS TEXT) = REPLACE(v_schedule.section, 'Section ', ''))
      AND (v_schedule.strand  IS NULL OR p.strand = v_schedule.strand)
    ON CONFLICT (schedule_id, user_id) DO NOTHING;

  -- College: match enrollment_type + section
  ELSIF v_schedule.enrollment_type = 'college_student' THEN
    INSERT INTO schedule_enrollments (schedule_id, user_id, role)
    SELECT p_schedule_id, p.id, 'student'
    FROM profiles p
    WHERE p.role = 'college_student'
      AND (v_schedule.section IS NULL OR CAST(p.section AS TEXT) = REPLACE(v_schedule.section, 'Section ', ''))
    ON CONFLICT (schedule_id, user_id) DO NOTHING;

  -- TESDA Scholar: match enrollment_type + batch
  ELSIF v_schedule.enrollment_type = 'tesda_scholar' THEN
    INSERT INTO schedule_enrollments (schedule_id, user_id, role)
    SELECT p_schedule_id, p.id, 'student'
    FROM profiles p
    WHERE p.role = 'scholar'
      AND (v_schedule.batch IS NULL OR CAST(p.batch_number AS TEXT) = REPLACE(v_schedule.batch, 'Batch ', ''))
    ON CONFLICT (schedule_id, user_id) DO NOTHING;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function: auto-assign instructor from subjects linked to the schedule's course
CREATE OR REPLACE FUNCTION auto_assign_instructor_to_schedule(p_schedule_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_schedule  RECORD;
  v_count     INTEGER := 0;
BEGIN
  SELECT * INTO v_schedule FROM course_schedules WHERE id = p_schedule_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Assign all instructors assigned to subjects of this course
  INSERT INTO schedule_enrollments (schedule_id, user_id, role)
  SELECT DISTINCT p_schedule_id, s.instructor_id, 'instructor'
  FROM subjects s
  WHERE s.course_id = v_schedule.course_id
    AND s.instructor_id IS NOT NULL
  ON CONFLICT (schedule_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger: auto-enroll on schedule insert
CREATE OR REPLACE FUNCTION trigger_auto_enroll_schedule()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM auto_enroll_students_to_schedule(NEW.id);
  PERFORM auto_assign_instructor_to_schedule(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_enroll_schedule ON course_schedules;
CREATE TRIGGER trg_auto_enroll_schedule
  AFTER INSERT ON course_schedules
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_enroll_schedule();

-- 6. Trigger: re-enroll when instructor is assigned to a subject
CREATE OR REPLACE FUNCTION trigger_sync_instructor_to_schedules()
RETURNS TRIGGER AS $$
BEGIN
  -- When instructor_id changes on a subject, update all schedules for that course
  IF NEW.instructor_id IS DISTINCT FROM OLD.instructor_id THEN
    -- Remove old instructor from schedules of this course (if no longer assigned to any subject)
    IF OLD.instructor_id IS NOT NULL THEN
      DELETE FROM schedule_enrollments se
      WHERE se.user_id = OLD.instructor_id
        AND se.role = 'instructor'
        AND se.schedule_id IN (
          SELECT id FROM course_schedules WHERE course_id = NEW.course_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM subjects s2
          WHERE s2.course_id = NEW.course_id
            AND s2.instructor_id = OLD.instructor_id
            AND s2.id != NEW.id
        );
    END IF;

    -- Add new instructor to all schedules for this course
    IF NEW.instructor_id IS NOT NULL THEN
      INSERT INTO schedule_enrollments (schedule_id, user_id, role)
      SELECT cs.id, NEW.instructor_id, 'instructor'
      FROM course_schedules cs
      WHERE cs.course_id = NEW.course_id
      ON CONFLICT (schedule_id, user_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_instructor_schedules ON subjects;
CREATE TRIGGER trg_sync_instructor_schedules
  AFTER UPDATE OF instructor_id ON subjects
  FOR EACH ROW EXECUTE FUNCTION trigger_sync_instructor_to_schedules();

-- 7. Backfill existing schedules
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM course_schedules LOOP
    PERFORM auto_enroll_students_to_schedule(r.id);
    PERFORM auto_assign_instructor_to_schedule(r.id);
  END LOOP;
END $$;

-- 8. Verify
SELECT 
  se.role,
  COUNT(*) as count
FROM schedule_enrollments se
GROUP BY se.role;
