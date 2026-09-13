-- ==============================================================================
-- PATHER SAATHI: FRESH START DATABASE RESET & DRIVER TRACKING SETUP
-- Run this script in the Supabase Cloud SQL Editor:
-- https://supabase.com/dashboard/project/icgfsgeozajvveyfkcqj/sql/new
-- ==============================================================================

BEGIN;

-- 1. Temporarily disable foreign key constraints / bypass triggers for clean purge
SET session_replication_role = 'replica';

-- 2. Clear all bookings, vehicle assignments, and audit events
TRUNCATE TABLE public.booking_events CASCADE;
TRUNCATE TABLE public.booking_vehicles CASCADE;
TRUNCATE TABLE public.bookings CASCADE;
n
-- 3. Detach fleet vehicles from old owners (preserves all 10 buses)
ALTER TABLE public.vehicles ALTER COLUMN owner_id DROP NOT NULL;
UPDATE public.vehicles SET owner_id = NULL;

-- 4. Detach routes from old owners
UPDATE public.routes SET owner_id = NULL;

-- 5. Delete all records from public.users
DELETE FROM public.users;

-- 6. Delete all records from auth.users (cascades to identities, sessions, tokens)
DELETE FROM auth.users;

-- 7. Restore normal replication role
SET session_replication_role = 'origin';

-- 8. Extend user roles to include 'driver'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('customer', 'operator', 'driver'));

-- 9. Add driver assignment to schedules
ALTER TABLE public.schedules 
    ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_driver_id ON public.schedules(driver_id);

-- 10. Create trip_locations table for live GPS telemetry
CREATE TABLE IF NOT EXISTS public.trip_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_locations_schedule ON public.trip_locations(schedule_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_locations_driver ON public.trip_locations(driver_id);

-- 11. Row-Level Security on trip_locations
ALTER TABLE public.trip_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers can insert telemetry" ON public.trip_locations;
CREATE POLICY "Drivers can insert telemetry"
    ON public.trip_locations FOR INSERT
    TO authenticated
    WITH CHECK (
        driver_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'driver'
        )
    );

DROP POLICY IF EXISTS "Operators can view all telemetry" ON public.trip_locations;
CREATE POLICY "Operators can view all telemetry"
    ON public.trip_locations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

DROP POLICY IF EXISTS "Passengers can view telemetry for booked trip" ON public.trip_locations;
CREATE POLICY "Passengers can view telemetry for booked trip"
    ON public.trip_locations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.schedule_id = trip_locations.schedule_id
              AND b.customer_id = auth.uid()
              AND b.status = 'approved'
        )
    );

-- 12. Enable Realtime on trip_locations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'trip_locations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_locations;
    END IF;
END $$;

-- 13. Atomic RPCs for Driver Trip Lifecycle
CREATE OR REPLACE FUNCTION public.driver_start_trip(p_schedule_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_schedule RECORD;
BEGIN
    SELECT * INTO v_schedule FROM public.schedules WHERE id = p_schedule_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schedule not found');
    END IF;

    -- Authorized if assigned driver OR operator
    IF v_schedule.driver_id IS DISTINCT FROM v_user_id AND NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = v_user_id AND role = 'operator'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this schedule');
    END IF;

    UPDATE public.schedules
    SET status = 'in_transit',
        updated_at = now()
    WHERE id = p_schedule_id;

    RETURN jsonb_build_object('success', true, 'status', 'in_transit');
END;
$$;

CREATE OR REPLACE FUNCTION public.driver_end_trip(p_schedule_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_schedule RECORD;
BEGIN
    SELECT * INTO v_schedule FROM public.schedules WHERE id = p_schedule_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Schedule not found');
    END IF;

    -- Authorized if assigned driver OR operator
    IF v_schedule.driver_id IS DISTINCT FROM v_user_id AND NOT EXISTS (
        SELECT 1 FROM public.users WHERE id = v_user_id AND role = 'operator'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authorized for this schedule');
    END IF;

    UPDATE public.schedules
    SET status = 'completed',
        updated_at = now()
    WHERE id = p_schedule_id;

    RETURN jsonb_build_object('success', true, 'status', 'completed');
END;
$$;

-- 14. Ensure the auth trigger automatically grants the Operator/Owner role to support@pathersaathi.in
--     and auto-assigns all 10 buses to the new owner on signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
    normalized_phone text;
    safe_name text;
    safe_phone text;
    is_owner boolean;
BEGIN
    safe_name := NULLIF(TRIM(new.raw_user_meta_data->>'name'), '');
    IF safe_name IS NULL THEN
        safe_name := 'System Admin';
    END IF;

    safe_phone := NULLIF(TRIM(new.raw_user_meta_data->>'phone_number'), '');
    IF safe_phone IS NOT NULL AND safe_phone != '' THEN
        normalized_phone := safe_phone;
    END IF;

    is_owner := (LOWER(TRIM(new.email)) = 'support@pathersaathi.in');

    BEGIN
        INSERT INTO public.users (id, name, email, phone_number, role, verification_status)
        VALUES (
            new.id,
            safe_name,
            new.email,
            normalized_phone,
            CASE WHEN is_owner THEN 'operator' ELSE 'customer' END,
            CASE WHEN is_owner THEN 'verified' ELSE 'unverified' END
        )
        ON CONFLICT (id) DO UPDATE SET
            role = CASE WHEN is_owner THEN 'operator' ELSE public.users.role END,
            verification_status = CASE WHEN is_owner THEN 'verified' ELSE public.users.verification_status END;

        -- Automatically link existing preserved fleet to the fresh owner
        IF is_owner THEN
            UPDATE public.vehicles
            SET owner_id = new.id
            WHERE owner_id IS NULL;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error inserting into public.users for auth user %: %', new.id, SQLERRM;
    END;

    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;
