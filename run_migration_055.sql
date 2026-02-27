-- Run this in Supabase SQL Editor to add avatar_url to activity_logs_with_users view

DROP VIEW IF EXISTS activity_logs_with_users;

CREATE VIEW activity_logs_with_users AS
SELECT 
  al.id,
  al.user_id,
  al.activity_type,
  al.description,
  al.metadata,
  al.created_at,
  p.first_name AS user_first_name,
  p.last_name AS user_last_name,
  p.email AS user_email,
  p.role AS user_role,
  p.avatar_url AS user_avatar_url
FROM activity_logs al
LEFT JOIN profiles p ON al.user_id = p.id;
