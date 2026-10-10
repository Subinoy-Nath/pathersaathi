-- Add station_times JSONB column to schedules.
-- Stores per-station arrival times for a schedule run.
-- Format: [{ "name": "Silchar", "stop_order": 0, "time": "08:00" }, ...]

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS station_times JSONB;
