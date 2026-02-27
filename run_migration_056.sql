-- Run this in Supabase SQL Editor to add batch_number column to profiles

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS batch_number INTEGER;

COMMENT ON COLUMN profiles.batch_number IS 'Batch number for TESDA Scholar users';
