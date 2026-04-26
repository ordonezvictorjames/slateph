-- Migration: Ensure all user-linked tables cascade delete when a profile is removed
-- This covers tables that were missing ON DELETE CASCADE or had no FK at all.

-- ─── activity_logs ────────────────────────────────────────────────────────────
-- Ensure user_id FK exists with CASCADE (table may have been created without one)
DO $$
BEGIN
  -- Drop existing FK if it exists without CASCADE
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'activity_logs'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE activity_logs DROP CONSTRAINT ' || tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'activity_logs'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'user_id'
      LIMIT 1
    );
  END IF;

  -- Add FK with CASCADE
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'user_id') THEN
    ALTER TABLE activity_logs
      ADD CONSTRAINT activity_logs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ─── class_sessions (instructor_id) ──────────────────────────────────────────
-- instructor_id had no ON DELETE clause — set to SET NULL so the session is kept
-- but the instructor reference is cleared
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'class_sessions'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'instructor_id'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE class_sessions DROP CONSTRAINT ' || tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'class_sessions'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'instructor_id'
      LIMIT 1
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'class_sessions' AND column_name = 'instructor_id') THEN
    ALTER TABLE class_sessions
      ADD CONSTRAINT class_sessions_instructor_id_fkey
      FOREIGN KEY (instructor_id) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── course_schedules (created_by) ───────────────────────────────────────────
-- created_by had no ON DELETE clause — set to SET NULL to preserve the schedule
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'course_schedules'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'created_by'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE course_schedules DROP CONSTRAINT ' || tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'course_schedules'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'created_by'
      LIMIT 1
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'course_schedules' AND column_name = 'created_by') THEN
    ALTER TABLE course_schedules
      ADD CONSTRAINT course_schedules_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── subject_resources (created_by / updated_by → auth.users) ────────────────
-- These reference auth.users directly; set to SET NULL
DO $$
BEGIN
  -- created_by
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'subject_resources'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'created_by'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE subject_resources DROP CONSTRAINT ' || tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'subject_resources'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'created_by'
      LIMIT 1
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subject_resources' AND column_name = 'created_by') THEN
    ALTER TABLE subject_resources
      ADD CONSTRAINT subject_resources_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  -- updated_by
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'subject_resources'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'updated_by'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE subject_resources DROP CONSTRAINT ' || tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'subject_resources'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'updated_by'
      LIMIT 1
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subject_resources' AND column_name = 'updated_by') THEN
    ALTER TABLE subject_resources
      ADD CONSTRAINT subject_resources_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── section_settings (updated_by → auth.users) ──────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'section_settings'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'updated_by'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE section_settings DROP CONSTRAINT ' || tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'section_settings'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'updated_by'
      LIMIT 1
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'section_settings' AND column_name = 'updated_by') THEN
    ALTER TABLE section_settings
      ADD CONSTRAINT section_settings_updated_by_fkey
      FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── Verification: tables already correctly set with CASCADE ──────────────────
-- The following tables already have ON DELETE CASCADE and need no changes:
--   profiles            → auth.users (via Supabase auth trigger)
--   user_presence       → profiles(id)
--   notifications       → profiles(id)
--   feature_requests    → profiles(id)
--   feature_request_votes → profiles(id)
--   posts               → profiles(id)
--   post_reactions      → profiles(id)
--   post_comments       → profiles(id)
--   course_chat_messages (sender_id) → profiles(id)
--   course_enrollments (trainee_id) → profiles(id)
--   class_attendance (student_id) → profiles(id)
--   schedule_enrollments (user_id) → profiles(id)
--   user_sessions       → profiles(id)
--   user_badges         → profiles(id)
--   quiz_grades         → profiles(id)
--   connections         → profiles(id)
--   lounge_chat_messages (sender_id) → profiles(id)
--   registration_codes (created_by / used_by) → profiles(id) ON DELETE SET NULL
