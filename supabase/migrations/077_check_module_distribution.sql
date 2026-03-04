-- =============================================
-- CHECK MODULE DISTRIBUTION BY SUBJECT STATUS
-- See if modules are in active or inactive subjects
-- =============================================

-- Show which subjects have modules and their status
SELECT 
    s.id as subject_id,
    s.title as subject_title,
    s.status as subject_status,
    s.order_index,
    COUNT(m.id) as module_count
FROM subjects s
LEFT JOIN modules m ON m.subject_id = s.id
WHERE s.course_id = '2772e5c3-bf3d-4668-bc54-06f45648fe67'
GROUP BY s.id, s.title, s.status, s.order_index
ORDER BY s.order_index;

-- Show detailed module info with subject status
SELECT 
    s.title as subject_title,
    s.status as subject_status,
    m.title as module_title,
    m.status as module_status,
    m.order_index
FROM modules m
JOIN subjects s ON m.subject_id = s.id
WHERE s.course_id = '2772e5c3-bf3d-4668-bc54-06f45648fe67'
ORDER BY s.order_index, m.order_index;
