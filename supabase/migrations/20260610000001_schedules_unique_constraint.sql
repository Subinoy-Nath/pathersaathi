-- Add partial unique index to schedules table to prevent duplicate identical active schedules
CREATE UNIQUE INDEX IF NOT EXISTS schedules_vehicle_route_time_uniq_active
ON public.schedules (vehicle_id, route_id, departure_time)
WHERE deleted_at IS NULL;
