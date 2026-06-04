-- Update auth.users trigger to automatically sync to public.users and grant operator role to support@pathersaathi.in

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
    normalized_phone text;
    safe_name text;
    safe_phone text;
BEGIN
    -- Extract and sanitize the name
    safe_name := NULLIF(TRIM(new.raw_user_meta_data->>'name'), '');
    
    -- Default to 'Guest' if no name provided
    IF safe_name IS NULL THEN
        safe_name := 'Guest';
    END IF;

    -- Extract and sanitize the phone number
    safe_phone := NULLIF(TRIM(new.raw_user_meta_data->>'phone_number'), '');
    
    -- Basic normalization fallback if handled entirely by DB
    -- Server Action handles formatting, but DB ensures default
    IF safe_phone IS NOT NULL AND safe_phone != '' THEN
        normalized_phone := safe_phone;
    END IF;

    BEGIN
        INSERT INTO public.users (id, name, email, phone_number, role, verification_status)
        VALUES (
            new.id,
            safe_name,
            new.email,
            normalized_phone,
            CASE WHEN new.email = 'support@pathersaathi.in' THEN 'operator' ELSE 'customer' END,
            CASE WHEN new.email = 'support@pathersaathi.in' THEN 'verified' ELSE 'unverified' END
        )
        ON CONFLICT (id) DO NOTHING; -- Ensure idempotency
    EXCEPTION WHEN OTHERS THEN
        -- Log the error gracefully (Supabase writes to pg_stat_statements/postgres logs)
        RAISE WARNING 'Error inserting into public.users for auth user %: %', new.id, SQLERRM;
    END;

    RETURN new;
END;
$$;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Update any existing record if the admin already signed up
UPDATE public.users 
SET role = 'operator', verification_status = 'verified' 
WHERE email = 'support@pathersaathi.in';
