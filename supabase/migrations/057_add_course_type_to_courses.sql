-- =============================================
-- ADD COURSE_TYPE COLUMN TO COURSES
-- For Academic, TESDA, and UpSkill courses
-- =============================================

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'academic' CHECK (course_type IN ('academic', 'tesda', 'upskill'));

COMMENT ON COLUMN courses.course_type IS 'Type of course: academic, tesda, or upskill';
