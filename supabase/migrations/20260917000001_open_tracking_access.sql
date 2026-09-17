-- Migration: 20260917000001_open_tracking_access.sql
-- Description: Open tracking access - allow all authenticated users to view live bus GPS telemetry (trip_locations), view operator contacts, view schedules for tracking, and enable realtime broadcast for schedules

BEGIN;

-- 1. Drop previous restrictive passenger policy that required an approved ticket booking
DROP POLICY IF EXISTS "Passengers can view telemetry for booked trip" ON public.trip_locations;
DROP POLICY IF EXISTS "Authenticated users can view telemetry" ON public.trip_locations;

-- Allow any authenticated user to view trip telemetry (Open Tracking Access)
CREATE POLICY "Authenticated users can view telemetry"
    ON public.trip_locations FOR SELECT
    TO authenticated
    USING (true);

-- 2. Ensure schedules table is included in supabase_realtime publication for live status updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'schedules'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
    END IF;
END $$;

-- 3. Allow viewing schedules for tracking and status visibility (including cancelled/completed)
DROP POLICY IF EXISTS "Anyone can view active schedules" ON public.schedules;
CREATE POLICY "Anyone can view active schedules"
    ON public.schedules FOR SELECT
    USING (deleted_at IS NULL);

-- 4. Allow authenticated users to view operator and driver profiles for fleet support and dispatch contact
DROP POLICY IF EXISTS "Authenticated users can view operator and driver profiles" ON public.users;
CREATE POLICY "Authenticated users can view operator and driver profiles"
    ON public.users FOR SELECT
    TO authenticated
    USING (role IN ('operator', 'driver'));

COMMIT;
