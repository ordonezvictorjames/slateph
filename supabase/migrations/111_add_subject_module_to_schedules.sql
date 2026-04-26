-- Add subject_id and module_id to course_schedules
ALTER TABLE course_schedules
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES modules(id) ON DELETE SET NULL;

COMMENT ON COLUMN course_schedules.subject_id IS 'Optional: specific subject this schedule is for';
COMMENT ON COLUMN course_schedules.module_id IS 'Optional: specific module this schedule is for';
