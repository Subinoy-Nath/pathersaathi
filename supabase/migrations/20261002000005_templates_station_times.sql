-- 1. Add station_times JSONB to recurring_schedule_templates
ALTER TABLE public.recurring_schedule_templates
  ADD COLUMN IF NOT EXISTS station_times JSONB;

-- 2. Update the generator function to map station_times
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
        v_day_of_week := EXTRACT(DOW FROM v_target_date);

        FOR v_template IN 
            SELECT * FROM public.recurring_schedule_templates
            WHERE deleted_at IS NULL
              AND is_paused = false
              AND (paused_until IS NULL OR v_target_date > paused_until)
              AND v_day_of_week = ANY(days_of_week)
        LOOP
            -- Still need dep/arr timestamps for filtering, derived from the template's departure_time (origin) and estimated duration
            v_dep_timestamp := (v_target_date || ' ' || v_template.departure_time)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
            v_arr_timestamp := v_dep_timestamp + (v_template.estimated_duration_mins || ' minutes')::INTERVAL;

            IF v_dep_timestamp < now() THEN
                CONTINUE;
            END IF;

            INSERT INTO public.schedules (
                template_id, vehicle_id, route_id, driver_id,
                departure_time, arrival_time, total_seats, available_seats,
                base_fare, status, station_times
            )
            VALUES (
                v_template.id, v_template.vehicle_id, v_template.route_id, v_template.default_driver_id,
                v_dep_timestamp, v_arr_timestamp, v_template.total_seats, v_template.total_seats,
                v_template.base_fare, 'scheduled', v_template.station_times
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
