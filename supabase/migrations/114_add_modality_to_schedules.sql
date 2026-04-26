ALTER TABLE course_schedules
  ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'synchronous'
  CHECK (modality IN ('synchronous', 'asynchronous'));
