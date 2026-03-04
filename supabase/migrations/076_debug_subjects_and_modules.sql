-- =============================================
-- DEBUG SUBJECTS AND MODULES
-- Check if enrolled courses have active subjects and modules
-- =============================================

-- Check subjects for the enrolled course
SELECT 
    s.id,
    s.title,
    s.status,
    s.course_id,
    s.order_index,
    c.title as course_title
FROM subjects s
JOIN courses c ON s.course_id = c.id
WHERE s.course_id = '2772e5c3-bf3d-4668-bc54-06f45648fe67'
ORDER BY s.order_index;

-- Check modules for subjects in this course
SELECT 
    m.id,
    m.title,
    m.status,
    m.subject_id,
    m.order_index,
    s.title as subject_title,
    s.status as subject_status
FROM modules m
JOIN subjects s ON m.subject_id = s.id
WHERE s.course_id = '2772e5c3-bf3d-4668-bc54-06f45648fe67'
ORDER BY s.order_index, m.order_index;

-- Check user profile for the trainee
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    status
FROM profiles
WHERE id = '114a25f4-ec5f-4dbe-9318-0e9fe704a8ee';

-- Summary counts
SELECT 
    'Total Subjects' as metric,
    COUNT(*) as count
FROM subjects
WHERE course_id = '2772e5c3-bf3d-4668-bc54-06f45648fe67'
UNION ALL
SELECT 
    'Active Subjects' as metric,
    COUNT(*) as count
FROM subjects
WHERE course_id = '2772e5c3-bf3d-4668-bc54-06f45648fe67'
AND status = 'active'
UNION ALL
SELECT 
    'Total Modules' as metric,
    COUNT(*) as count
FROM modules m
JOIN subjects s ON m.subject_id = s.id
WHERE s.course_id = '2772e5c3-bf3d-4668-bc54-06f45648fe67';
