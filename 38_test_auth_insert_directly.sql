-- Test inserting directly into auth.users
-- Date: February 27, 2026

DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'direct.auth.test' || floor(random() * 10000)::text || '@test.com';
BEGIN
    -- Try direct insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        test_id,
        'authenticated',
        'authenticated',
        test_email,
        crypt('Pass123!', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Direct auth.users insert SUCCESS! Email: %, ID: %', test_email, test_id;
    
    -- Check if profile was created by trigger
    PERFORM * FROM profiles WHERE id = test_id;
    IF FOUND THEN
        RAISE NOTICE 'Profile was created by trigger!';
    ELSE
        RAISE NOTICE 'Profile was NOT created by trigger';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Direct auth.users insert FAILED: %', SQLERRM;
END $$;
