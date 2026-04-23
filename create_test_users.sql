-- Create 97 test users (10 instructors + 87 students with random types)
-- Assumes 3 existing users already in the system
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  student_roles user_role[] := ARRAY['jhs_student', 'shs_student', 'college_student', 'scholar']::user_role[];
  new_id UUID;
  user_role_val user_role;
  n INT;
BEGIN
  -- Create 10 instructors (users 1-10)
  FOR n IN 1..10 LOOP
    new_id := gen_random_uuid();
    INSERT INTO profiles (
      id, email, first_name, last_name, role,
      grade, section, strand, cluster, batch_number,
      created_at, updated_at
    ) VALUES (
      new_id,
      'instructor' || n || '@slatetest.com',
      'Instructor',
      'Test' || LPAD(n::TEXT, 2, '0'),
      'instructor'::user_role,
      NULL, NULL, NULL, NULL, NULL,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- Create 87 students with random types (users 11-97)
  FOR n IN 11..97 LOOP
    new_id := gen_random_uuid();
    user_role_val := student_roles[((n - 11) % 4) + 1];

    INSERT INTO profiles (
      id, email, first_name, last_name, role,
      grade, section, strand, cluster, batch_number,
      created_at, updated_at
    ) VALUES (
      new_id,
      'student' || n || '@slatetest.com',
      'Student',
      'Test' || LPAD(n::TEXT, 2, '0'),
      user_role_val,
      CASE user_role_val::TEXT
        WHEN 'jhs_student' THEN (7 + ((n - 11) % 4))
        WHEN 'shs_student' THEN (11 + ((n - 11) % 2))
        ELSE NULL
      END,
      CASE user_role_val::TEXT
        WHEN 'jhs_student' THEN 'Section ' || ((n % 5) + 1)
        WHEN 'shs_student' THEN 'Section ' || ((n % 5) + 1)
        WHEN 'college_student' THEN 'Section ' || ((n % 3) + 1)
        ELSE NULL
      END,
      CASE user_role_val::TEXT
        WHEN 'shs_student' THEN
          CASE (n % 4)
            WHEN 0 THEN 'STEM'
            WHEN 1 THEN 'ABM'
            WHEN 2 THEN 'HUMSS'
            ELSE 'TVL'
          END
        ELSE NULL
      END,
      CASE user_role_val::TEXT
        WHEN 'shs_student' THEN
          CASE (n % 2) WHEN 0 THEN 'academic' ELSE 'technical' END
        ELSE NULL
      END,
      CASE user_role_val::TEXT
        WHEN 'scholar' THEN ((n % 5) + 1)
        ELSE NULL
      END,
      NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  RAISE NOTICE 'Created 97 test users: 10 instructors + 87 students';
END $$;

-- Simulate all test users as online
INSERT INTO user_presence (user_id, last_seen)
SELECT id, NOW()
FROM profiles
WHERE email LIKE '%@slatetest.com'
ON CONFLICT (user_id) DO UPDATE SET last_seen = NOW();

-- Verify counts
SELECT role, COUNT(*) as count
FROM profiles
WHERE email LIKE '%@slatetest.com'
GROUP BY role
ORDER BY role;
