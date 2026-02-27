-- =============================================
-- CREATE CLASS SCHEDULING SYSTEM
-- Tables for managing class sessions and attendance
-- =============================================

-- Class Sessions Table
CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES profiles(id) NOT NULL,
  
  -- Schedule Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  session_type VARCHAR(50) DEFAULT 'lecture' CHECK (session_type IN ('lecture', 'lab', 'workshop', 'exam', 'consultation')),
  
  -- Time & Date
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Location
  location_type VARCHAR(50) DEFAULT 'physical' CHECK (location_type IN ('physical', 'online', 'hybrid')),
  room_number VARCHAR(100),
  online_meeting_url TEXT,
  
  -- Enrollment filters
  enrollment_type VARCHAR(50) DEFAULT 'both' CHECK (enrollment_type IN ('student', 'tesda_scholar', 'both')),
  sections TEXT[], -- ['Einstein', 'Newton'] for specific sections
  batch_numbers INTEGER[], -- [1, 2, 3] for TESDA batches
  
  -- Status
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  
  -- Metadata
  max_attendees INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance Tracking Table
CREATE TABLE IF NOT EXISTS class_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  status VARCHAR(50) DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'late', 'excused')),
  check_in_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(session_id, student_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_sessions_course ON class_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_subject ON class_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_instructor ON class_sessions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_start_time ON class_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_class_sessions_status ON class_sessions(status);
CREATE INDEX IF NOT EXISTS idx_class_attendance_session ON class_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_student ON class_attendance(student_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_class_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp
DROP TRIGGER IF EXISTS trigger_update_class_session_timestamp ON class_sessions;
CREATE TRIGGER trigger_update_class_session_timestamp
  BEFORE UPDATE ON class_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_class_session_timestamp();

-- Enable RLS (but disable for custom auth)
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;

-- Disable RLS for custom authentication
ALTER TABLE class_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE class_attendance DISABLE ROW LEVEL SECURITY;

-- Create view for sessions with instructor and course details
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
