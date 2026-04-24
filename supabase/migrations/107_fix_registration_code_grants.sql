-- =============================================
-- FIX REGISTRATION CODE FUNCTION GRANTS
-- generate_registration_code was only granted to 'authenticated'
-- but this app uses custom auth (anon key only)
-- =============================================

GRANT EXECUTE ON FUNCTION generate_registration_code TO anon;
GRANT EXECUTE ON FUNCTION validate_registration_code TO anon;
GRANT EXECUTE ON FUNCTION mark_code_as_used TO anon;
