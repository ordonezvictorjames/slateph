-- =============================================
-- REMOVE IP_ADDRESS AND USER_AGENT COLUMNS
-- These columns cause errors when NULL values are inserted
-- =============================================

-- Drop the columns with CASCADE to automatically drop dependent views
ALTER TABLE activity_logs 
DROP COLUMN IF EXISTS ip_address CASCADE,
DROP COLUMN IF EXISTS user_agent CASCADE;

-- Recreate the views without ip_address and user_agent (if they existed)
CREATE OR REPLACE VIEW activity_logs_with_users AS
SELECT 
  al.id,
  al.user_id,
  al.activity_type,
  al.description,
  al.metadata,
  al.created_at,
  p.first_name,
  p.last_name,
  p.email,
  p.role
FROM activity_logs al
LEFT JOIN profiles p ON al.user_id = p.id;

CREATE OR REPLACE VIEW activity_logs_simple AS
SELECT 
  id,
  user_id,
  activity_type,
  description,
  created_at
FROM activity_logs;
