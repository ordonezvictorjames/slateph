-- Fix column name: password_hash -> password
DROP FUNCTION IF EXISTS public.create_user_account(text, text, text, text, text);

CREATE FUNCTION public.create_user_account(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_password TEXT,
    p_role TEXT DEFAULT 'guest'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_password_hash TEXT;
    v_role user_role;
BEGIN
    IF p_role NOT IN ('admin', 'developer', 'instructor', 'scholar', 'shs_student', 'jhs_student', 'college_student', 'guest') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid role: ' || p_role);
    END IF;

    BEGIN
        v_role := p_role::user_role;
    EXCEPTION
        WHEN invalid_text_representation THEN
            RETURN json_build_object('success', false, 'message', 'Invalid role value: ' || p_role);
    END;

    v_user_id := gen_random_uuid();
    v_password_hash := crypt(p_password, gen_salt('bf'));

    INSERT INTO profiles (
        id, email, first_name, last_name, role, password, status, created_at, updated_at
    ) VALUES (
        v_user_id, p_email, p_first_name, p_last_name, v_role, v_password_hash, 'active', NOW(), NOW()
    );

    RETURN json_build_object(
        'success', true,
        'message', 'User account created successfully',
        'user', json_build_object(
            'id', v_user_id,
            'email', p_email,
            'first_name', p_first_name,
            'last_name', p_last_name,
            'role', p_role
        )
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object('success', false, 'message', 'Email already exists');
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Failed to create user: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_account(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
