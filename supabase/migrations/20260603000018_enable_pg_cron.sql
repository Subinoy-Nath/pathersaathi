-- Phase 6E: Enable pg_cron for automatic booking expiry
-- Depends on the expire_stale_bookings() function created in 20260603000015_booking_expiry.sql

-- Enable pg_cron extension (requires superuser, Supabase allows this for postgres role)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the expiry function to run every hour at minute 0
-- Using DO block to handle cases where it might already be scheduled or fail gracefully if cron is unavailable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_extension 
    WHERE extname = 'pg_cron'
  ) THEN
    -- Try to unschedule if it exists to avoid duplicates
    BEGIN
      PERFORM cron.unschedule('expire-stale-bookings');
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if not found
    END;
    
    -- Schedule it
    PERFORM cron.schedule('expire-stale-bookings', '0 * * * *', 'SELECT public.expire_stale_bookings()');
  END IF;
END $$;
