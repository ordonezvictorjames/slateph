-- Migration: Migrate from subject enrollments to course enrollments
-- Date: 2024-02-16
-- Description: Change enrollment system from subject-level to course-level

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'dropped')),
    progress DECIMAL(5,2) DEFAULT 0.00 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique enrollment per student per course
    UNIQUE(course_id, student_id)
);

-- Disable RLS (we use custom authentication)
ALTER TABLE course_enrollments DISABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX idx_course_enrollments_status ON course_enrollments(status);

-- Add comments for documentation
COMMENT ON TABLE course_enrollments IS 'Tracks student enrollments in courses';
COMMENT ON COLUMN course_enrollments.course_id IS 'Reference to the course';
COMMENT ON COLUMN course_enrollments.student_id IS 'Reference to the student profile';
COMMENT ON COLUMN course_enrollments.status IS 'Enrollment status: active, inactive, completed, dropped';
COMMENT ON COLUMN course_enrollments.progress IS 'Student progress percentage (0-100)';

-- Migrate existing subject_enrollments data to course_enrollments
-- This will enroll students in courses if they were enrolled in any subject under that course
INSERT INTO course_enrollments (course_id, student_id, enrolled_at, status, created_at, updated_at)
SELECT DISTINCT
    s.course_id,
    se.student_id,
    MIN(se.enrolled_at) as enrolled_at,
    'active' as status,
    MIN(se.created_at) as created_at,
    NOW() as updated_at
FROM subject_enrollments se
JOIN subjects s ON se.subject_id = s.id
WHERE s.course_id IS NOT NULL
GROUP BY s.course_id, se.student_id
ON CONFLICT (course_id, student_id) DO NOTHING;

-- Optional: Keep subject_enrollments table for now (can be dropped later if not needed)
-- To drop it later, run: DROP TABLE subject_enrollments CASCADE;

-- Verify migration
SELECT 
    'course_enrollments' as table_name,
    COUNT(*) as total_enrollments,
    COUNT(DISTINCT course_id) as unique_courses,
    COUNT(DISTINCT student_id) as unique_students
FROM course_enrollments;
