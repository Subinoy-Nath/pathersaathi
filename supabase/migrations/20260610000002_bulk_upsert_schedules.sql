CREATE OR REPLACE FUNCTION public.upsert_schedules(p_schedules jsonb)
RETURNS void AS $$
BEGIN
  INSERT INTO public.schedules (
    vehicle_id, route_id, departure_time, arrival_time, status,
    base_fare, total_seats, available_seats
  )
  SELECT
    (row->>'vehicle_id')::uuid,
    (row->>'route_id')::uuid,
    (row->>'departure_time')::timestamptz,
    (row->>'arrival_time')::timestamptz,
    row->>'status',
    (row->>'base_fare')::decimal,
    (row->>'total_seats')::integer,
    (row->>'available_seats')::integer
  FROM jsonb_array_elements(p_schedules) AS row
  ON CONFLICT (vehicle_id, route_id, departure_time) WHERE deleted_at IS NULL
  DO UPDATE SET
    arrival_time = EXCLUDED.arrival_time,
    status = EXCLUDED.status,
    base_fare = EXCLUDED.base_fare,
    total_seats = EXCLUDED.total_seats
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.schedule_id = public.schedules.id
    AND b.status IN ('pending', 'approved')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
