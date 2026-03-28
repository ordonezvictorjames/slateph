-- Add index on activity_logs.user_id to speed up the profiles join
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id
  ON public.activity_logs (user_id);

-- Add index on created_at for the ORDER BY + LIMIT pattern
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
  ON public.activity_logs (created_at DESC);
