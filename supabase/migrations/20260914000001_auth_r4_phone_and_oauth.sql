-- Migration: 20260914000001_auth_r4_phone_and_oauth.sql
-- Description: Drop NOT NULL on email, partial unique indexes, role check expansion, trigger update.

BEGIN;

-- 1. Drop NOT NULL on public.users.email to permit Phone OTP signups
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- 2. Drop legacy table-level constraints if present
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_number_key;

-- 3. Partial unique indexes for performance and multi-null safety
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx 
    ON public.users(LOWER(email)) 
    WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique_idx 
    ON public.users(phone_number) 
    WHERE phone_number IS NOT NULL AND deleted_at IS NULL;

-- 4. Harmonize role check constraint to include 'admin'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('customer', 'operator', 'driver', 'admin'));

-- 5. Hardened handle_new_user trigger supporting phone auth & Google OAuth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
    normalized_phone text;
    safe_name text;
    is_owner boolean;
BEGIN
    -- Prefer native phone from auth.users, fallback to user metadata
    normalized_phone := NULLIF(TRIM(COALESCE(
        new.phone,
        new.raw_user_meta_data->>'phone_number',
        new.raw_user_meta_data->>'phone'
    )), '');

    -- Extract display name (Google OAuth passes 'full_name' or 'name')
    safe_name := NULLIF(TRIM(COALESCE(
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'user_name'
    )), '');

    IF safe_name IS NULL THEN
        IF normalized_phone IS NOT NULL AND length(normalized_phone) >= 4 THEN
            safe_name := 'Passenger ' || RIGHT(normalized_phone, 4);
        ELSIF new.email IS NOT NULL THEN
            safe_name := split_part(new.email, '@', 1);
        ELSE
            safe_name := 'Passenger';
        END IF;
    END IF;

    is_owner := (new.email IS NOT NULL AND LOWER(TRIM(new.email)) = 'support@pathersaathi.in');

    BEGIN
        INSERT INTO public.users (
            id, name, email, phone_number, role, verification_status, created_at, updated_at
        )
        VALUES (
            new.id, safe_name, new.email, normalized_phone,
            CASE WHEN is_owner THEN 'operator' ELSE 'customer' END,
            CASE WHEN is_owner THEN 'verified' ELSE 'unverified' END,
            now(), now()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = COALESCE(public.users.name, EXCLUDED.name),
            email = COALESCE(public.users.email, EXCLUDED.email),
            phone_number = COALESCE(public.users.phone_number, EXCLUDED.phone_number),
            role = CASE WHEN is_owner THEN 'operator' ELSE public.users.role END,
            verification_status = CASE WHEN is_owner THEN 'verified' ELSE public.users.verification_status END,
            updated_at = now();

        IF is_owner THEN
            UPDATE public.vehicles SET owner_id = new.id WHERE owner_id IS NULL;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'CRITICAL: Failed to create public.users profile for auth UID %: %', new.id, SQLERRM;
    END;

    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;
