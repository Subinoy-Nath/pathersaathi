-- Seed script for initial Phase 1 data

-- 1. Insert seed locations
INSERT INTO public.locations (name, description) VALUES
    ('Silchar', 'City in Cachar district'),
    ('Sribhumi', 'Sribhumi district (formerly Karimganj)'),
    ('Patherkandi', 'Town in Sribhumi district'),
    ('Lowairpoa', 'Town in Sribhumi district'),
    ('Bazarichera', 'Town in Sribhumi district'),
    ('Kotamoni', 'Town in Assam')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert a seed operator and vehicles
DO $$
DECLARE
    operator_id UUID := gen_random_uuid();
BEGIN
    -- Ensure pgcrypto is available (Supabase has it by default in extensions)
    -- Insert into auth.users (minimal fields needed for Supabase Auth to allow login)
    INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at, 
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
        role, confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
        operator_id,
        '00000000-0000-0000-0000-000000000000',
        'operator@pathersaathi.com',
        -- IMPORTANT: Change this password immediately in production
        crypt('Ps@Oper2026!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"name":"System Operator"}',
        now(),
        now(),
        'authenticated',
        '',
        '',
        '',
        ''
    );

    -- Insert into public.users
    INSERT INTO public.users (id, name, email, phone_number, role, verification_status)
    VALUES (
        operator_id,
        'System Operator',
        'operator@pathersaathi.com',
        '+916002089037',
        'operator',
        'verified'
    );

    -- Insert vehicles owned by this operator
    -- Note: Registration numbers are made unique by appending suffixes
    INSERT INTO public.vehicles (owner_id, name, vehicle_type, features, capacity_seats, registration_number, image_url) VALUES
        (operator_id, 'Shibam Coach 01', 'bus', 'AC • Luxury • Charging', 40, 'AS10D5047-01', '/images/bus1.jpg'),
        (operator_id, 'Shibam Coach 02', 'bus', 'AC • Luxury • Charging', 38, 'AS10D5047-02', '/images/bus2.jpg'),
        (operator_id, 'Shibam Coach 03', 'bus', 'AC • Luxury • Charging', 38, 'AS10D5047-03', '/images/bus3.jpg'),
        (operator_id, 'Shibam Coach 04', 'bus', 'AC • Luxury • Charging', 32, 'AS10D5047-04', '/images/bus4.jpg'),
        (operator_id, 'Shibam Coach 05', 'bus', 'AC • Luxury • Charging', 32, 'AS10D5047-05', '/images/bus5.jpg'),
        (operator_id, 'Shibam Coach 06', 'bus', 'Non-AC', 30, 'AS10D5047-06', '/images/bus6.jpg'),
        (operator_id, 'Shibam Coach 07', 'bus', 'Non-AC', 30, 'AS10D5047-07', '/images/bus7.jpg'),
        (operator_id, 'Shibam Coach 08', 'bus', 'Non-AC', 30, 'AS10D5047-08', '/images/bus8.jpg'),
        (operator_id, 'Shibam Coach 09', 'bus', 'Non-AC', 30, 'AS10D5047-09', '/images/bus9.jpg'),
        (operator_id, 'Shibam Coach 10', 'bus', 'Non-AC', 30, 'AS10D5047-10', '/images/bus10.jpg');

END $$;
