-- Phase 6C: Atomic Seat Allocation
-- Replaces the race-prone read-then-write pattern with atomic PostgreSQL functions.

-- book_seats: Atomically decrement available_seats. Returns FALSE if insufficient seats.
CREATE OR REPLACE FUNCTION public.book_seats(
  p_schedule_id UUID,
  p_seats_requested INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Single atomic UPDATE that only succeeds if seats are available
  UPDATE public.schedules
  SET available_seats = available_seats - p_seats_requested
  WHERE id = p_schedule_id
    AND available_seats >= p_seats_requested
    AND status = 'scheduled'
    AND deleted_at IS NULL;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER
   SET search_path = public;

-- restore_seats: Atomically restore seats on cancellation/rejection.
-- Caps at total_seats to prevent over-restoration.
CREATE OR REPLACE FUNCTION public.restore_seats(
  p_schedule_id UUID,
  p_seats_to_restore INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE public.schedules
  SET available_seats = LEAST(available_seats + p_seats_to_restore, total_seats)
  WHERE id = p_schedule_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER
   SET search_path = public;

-- Revoke direct RPC access from anon (these are called via server actions, not client)
REVOKE EXECUTE ON FUNCTION public.book_seats(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.restore_seats(UUID, INTEGER) FROM anon;
