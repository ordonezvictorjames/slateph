SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enrollment_type') as has_enrollment_type;
