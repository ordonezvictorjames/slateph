-- Run this in Supabase SQL Editor to add course_type column to courses

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS course_type TEXT DEFAULT 'academic' CHECK (course_type IN ('academic', 'tesda', 'upskill'));

COMMENT ON COLUMN courses.course_type IS 'Type of course: academic, tesda, or upskill';
