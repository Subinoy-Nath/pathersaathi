-- Seed or update the support@pathersaathi.in admin user with a specific password

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if the user already exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'support@pathersaathi.in';

    IF v_user_id IS NULL THEN
        -- Generate a new UUID for the admin user
        v_user_id := gen_random_uuid();
        
        -- Insert into auth.users
        INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at, 
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
            role, confirmation_token, recovery_token, email_change_token_new, email_change, aud
        )
        VALUES (
            v_user_id,
            '00000000-0000-0000-0000-000000000000',
            'support@pathersaathi.in',
            crypt('Subinoy@1234', gen_salt('bf')),
            current_timestamp,
            '{"provider":"email","providers":["email"]}',
            '{"name": "System Admin", "phone_number": ""}',
            current_timestamp,
            current_timestamp,
            'authenticated',
            '', '', '', '', 'authenticated'
        );

        -- Insert corresponding auth identity
        INSERT INTO auth.identities (
            id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            format('{"sub":"%s","email":"%s"}', v_user_id::text, 'support@pathersaathi.in')::jsonb,
            'email',
            current_timestamp,
            current_timestamp,
            current_timestamp
        );
    ELSE
        -- Update password for existing user
        UPDATE auth.users
        SET encrypted_password = crypt('Subinoy@1234', gen_salt('bf')),
            updated_at = current_timestamp
        WHERE id = v_user_id;
    END IF;

    -- The trigger `handle_new_user` will automatically sync this to public.users and grant 'operator' role
    -- But just to be sure if the trigger was missed for an existing user:
    UPDATE public.users 
    SET role = 'operator', verification_status = 'verified' 
    WHERE email = 'support@pathersaathi.in';

END $$;
