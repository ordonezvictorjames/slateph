-- STEP 1: Add new enum values only
-- Run this first, then run step2 separately after this completes

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'shs_student';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'jhs_student';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'college_student';
