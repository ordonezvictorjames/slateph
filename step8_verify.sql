SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype 
ORDER BY enumsortorder;

SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role;
