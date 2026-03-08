UPDATE profiles SET role = 'student' WHERE role = 'trainee';
UPDATE profiles SET role = 'scholar' WHERE role = 'tesda_scholar';

SELECT role, COUNT(*) FROM profiles GROUP BY role;
