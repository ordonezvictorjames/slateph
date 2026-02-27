-- =============================================
-- CREATE COURSE SCHEDULES SYSTEM
-- For scheduling course batches/cohorts
-- =============================================

-- Course Schedules Table
CREATE TABLE IF NOT EXISTS course_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  
  -- Schedule Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  batch_number INTEGER NOT NULL,
  
  -- Date Range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Student Filters
  enrollment_type VARCHAR(50) DEFAULT 'both' CHECK (enrollment_type IN ('student', 'tesda_scholar', 'both')),
  sections TEXT[], -- ['Einstein', 'Newton'] for specific sections
  grade_levels INTEGER[], -- [7, 8, 9] for specific grades
  strands TEXT[], -- ['STEM', 'ABM'] for specific strands
  batch_numbers INTEGER[], -- [1, 2, 3] for TESDA batches (if enrollment_type is tesda_scholar)
  
  -- Status
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_schedules_course ON course_schedules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_schedules_start_date ON course_schedules(start_date);
CREATE INDEX IF NOT EXISTS idx_course_schedules_end_date ON course_schedules(end_date);
CREATE INDEX IF NOT EXISTS idx_course_schedules_status ON course_schedules(status);
CREATE INDEX IF NOT EXISTS idx_course_schedules_grade_levels ON course_schedules USING GIN (grade_levels);
CREATE INDEX IF NOT EXISTS idx_course_schedules_strands ON course_schedules USING GIN (strands);
CREATE INDEX IF NOT EXISTS idx_course_schedules_sections ON course_schedules USING GIN (sections);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
DROP TRIGGER IF EXISTS trigger_update_course_schedule_timestamp ON course_schedules;
CREATE TRIGGER trigger_update_course_schedule_timestamp
  BEFORE UPDATE ON course_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_course_schedule_timestamp();

-- Enable RLS (but disable for custom auth)
ALTER TABLE course_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_schedules DISABLE ROW LEVEL SECURITY;

-- Create view for schedules with course details
CREATE OR REPLACE VIEW course_schedules_with_details AS
SELECT 
  cs.*,
  c.title as course_title,
  c.course_group,
  c.course_type,
  c.color,
  p.first_name as creator_first_name,
  p.last_name as creator_last_name
FROM course_schedules cs
LEFT JOIN courses c ON cs.course_id = c.id
LEFT JOIN profiles p ON cs.created_by = p.id;

-- Add comments
COMMENT ON TABLE course_schedules IS 'Stores course schedule batches/cohorts with date ranges';
COMMENT ON COLUMN course_schedules.sections IS 'Array of sections (e.g., [''Einstein'', ''Newton''])';
COMMENT ON COLUMN course_schedules.grade_levels IS 'Array of grade levels (e.g., [7, 8, 9])';
COMMENT ON COLUMN course_schedules.strands IS 'Array of SHS strands (e.g., [''STEM'', ''ABM''])';
COMMENT ON COLUMN course_schedules.batch_numbers IS 'Array of TESDA batch numbers (e.g., [1, 2, 3])';
