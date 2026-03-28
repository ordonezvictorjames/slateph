-- Add cluster column back to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cluster character varying;
