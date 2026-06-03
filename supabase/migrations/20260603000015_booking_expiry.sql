-- Phase 6C: Booking Expiry
-- Auto-expire pending bookings older than 24 hours and restore their seats.
-- Designed to be called via pg_cron or a Supabase Edge Function on a schedule.

CREATE OR REPLACE FUNCTION public.expire_stale_bookings()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER := 0;
  rec RECORD;
BEGIN
  -- Find and expire pending bookings older than 24 hours
  FOR rec IN
    SELECT b.id, b.schedule_id, b.seats_requested
    FROM public.bookings b
    WHERE b.status = 'pending'
      AND b.created_at < now() - interval '24 hours'
      AND b.deleted_at IS NULL
  LOOP
    -- Update booking status to cancelled
    UPDATE public.bookings
    SET status = 'cancelled',
        operator_notes = COALESCE(operator_notes || ' | ', '') || 'Auto-expired: pending for over 24 hours'
    WHERE id = rec.id;

    -- Restore seats if schedule exists
    IF rec.schedule_id IS NOT NULL AND rec.seats_requested IS NOT NULL THEN
      PERFORM public.restore_seats(rec.schedule_id, rec.seats_requested);
    END IF;

    expired_count := expired_count + 1;
  END LOOP;

  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- Block direct client access — this runs on a schedule, not via user RPC
REVOKE EXECUTE ON FUNCTION public.expire_stale_bookings() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_stale_bookings() FROM authenticated;

-- Enable pg_cron if available (Supabase Cloud supports this)
-- If pg_cron is not enabled, use a Supabase Edge Function on a CRON schedule instead.
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('expire-stale-bookings', '0 * * * *', 'SELECT public.expire_stale_bookings()');
