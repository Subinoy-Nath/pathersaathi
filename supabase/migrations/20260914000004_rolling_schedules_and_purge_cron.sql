-- Migration: 20260914000004_rolling_schedules_and_purge_cron.sql
-- Description: Rolling schedule generator function, telemetry purge function, and pg_cron jobs.

BEGIN;

-- 1. Rolling schedule generator function
CREATE OR REPLACE FUNCTION public.generate_rolling_schedules(p_days_ahead INT DEFAULT 14)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_template RECORD;
    v_target_date DATE;
    v_day_of_week INT;
    v_dep_timestamp TIMESTAMPTZ;
    v_arr_timestamp TIMESTAMPTZ;
    v_inserted_count INT := 0;
    v_skipped_count INT := 0;
BEGIN
    FOR i IN 0..(p_days_ahead - 1) LOOP
        v_target_date := CURRENT_DATE + i;
        v_day_of_week := EXTRACT(DOW FROM v_target_date); -- 0=Sun, 1=Mon ... 6=Sat

        FOR v_template IN 
            SELECT * FROM public.recurring_schedule_templates
            WHERE deleted_at IS NULL
              AND is_paused = false
              AND (paused_until IS NULL OR v_target_date > paused_until)
              AND v_day_of_week = ANY(days_of_week)
        LOOP
            v_dep_timestamp := (v_target_date || ' ' || v_template.departure_time)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
            v_arr_timestamp := v_dep_timestamp + (v_template.estimated_duration_mins || ' minutes')::INTERVAL;

            IF v_dep_timestamp < now() THEN
                CONTINUE;
            END IF;

            INSERT INTO public.schedules (
                template_id, vehicle_id, route_id, driver_id,
                departure_time, arrival_time, total_seats, available_seats,
                base_fare, status
            )
            VALUES (
                v_template.id, v_template.vehicle_id, v_template.route_id, v_template.default_driver_id,
                v_dep_timestamp, v_arr_timestamp, v_template.total_seats, v_template.total_seats,
                v_template.base_fare, 'scheduled'
            )
            ON CONFLICT (vehicle_id, route_id, departure_time) WHERE deleted_at IS NULL
            DO NOTHING;

            IF FOUND THEN
                v_inserted_count := v_inserted_count + 1;
            ELSE
                v_skipped_count := v_skipped_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'inserted_runs', v_inserted_count,
        'skipped_existing', v_skipped_count,
        'horizon_days', p_days_ahead,
        'executed_at', now()
    );
END;
$$;

-- 2. DPDPA 30-day telemetry purge function
CREATE OR REPLACE FUNCTION public.purge_stale_trip_locations(p_retention_days INT DEFAULT 30)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM public.trip_locations
    WHERE recorded_at < (now() - (p_retention_days || ' days')::INTERVAL);
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

-- 3. Register pg_cron jobs if pg_cron extension is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            PERFORM cron.unschedule('generate-rolling-schedules-nightly');
        EXCEPTION WHEN OTHERS THEN END;

        PERFORM cron.schedule(
            'generate-rolling-schedules-nightly',
            '0 1 * * *',
            'SELECT public.generate_rolling_schedules(14);'
        );

        BEGIN
            PERFORM cron.unschedule('purge-stale-telemetry-weekly');
        EXCEPTION WHEN OTHERS THEN END;

        PERFORM cron.schedule(
            'purge-stale-telemetry-weekly',
            '0 2 * * 0',
            'SELECT public.purge_stale_trip_locations(30);'
        );
    END IF;
END $$;

COMMIT;
