-- =============================================
-- ENHANCE CLASS SCHEDULING SYSTEM
-- Add grade levels and strands filters
-- =============================================

-- Add grade_levels and strands columns to class_sessions
ALTER TABLE class_sessions 
ADD COLUMN IF NOT EXISTS grade_levels INTEGER[],
ADD COLUMN IF NOT EXISTS strands TEXT[];

-- Add comments for documentation
COMMENT ON COLUMN class_sessions.grade_levels IS 'Array of grade levels (e.g., [7, 8, 9] for grades 7-9)';
COMMENT ON COLUMN class_sessions.strands IS 'Array of SHS strands (e.g., [''STEM'', ''ABM''] for STEM and ABM students)';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_class_sessions_grade_levels ON class_sessions USING GIN (grade_levels);
CREATE INDEX IF NOT EXISTS idx_class_sessions_strands ON class_sessions USING GIN (strands);

-- Update the view to include new columns
DROP VIEW IF EXISTS class_sessions_with_details;
CREATE OR REPLACE VIEW class_sessions_with_details AS
SELECT 
  cs.*,
  c.title as course_title,
  c.course_group,
  c.course_type,
  s.title as subject_title,
  p.first_name as instructor_first_name,
  p.last_name as instructor_last_name,
  p.email as instructor_email,
  (
    SELECT COUNT(*)
    FROM class_attendance ca
    WHERE ca.session_id = cs.id
  ) as total_attendees,
  (
    SELECT COUNT(*)
    FROM class_attendance ca
    WHERE ca.session_id = cs.id AND ca.status = 'present'
  ) as present_count
FROM class_sessions cs
LEFT JOIN courses c ON cs.course_id = c.id
LEFT JOIN subjects s ON cs.subject_id = s.id
LEFT JOIN profiles p ON cs.instructor_id = p.id;
