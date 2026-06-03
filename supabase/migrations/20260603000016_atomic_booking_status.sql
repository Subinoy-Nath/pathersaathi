-- Phase 6C: Atomic Booking Status Functions
-- Consolidates booking status transitions + seat restoration into single atomic database calls.

-- 1. update_booking_status_atomic: For operators to approve/reject/cancel bookings
CREATE OR REPLACE FUNCTION public.update_booking_status_atomic(
  p_booking_id UUID,
  p_new_status TEXT,
  p_actor_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_booking RECORD;
  v_is_owner BOOLEAN := FALSE;
BEGIN
  SELECT b.id, b.status, b.schedule_id, b.seats_requested, b.booking_type
  INTO v_booking FROM public.bookings b
  WHERE b.id = p_booking_id AND b.deleted_at IS NULL;

  IF NOT FOUND THEN RETURN 'not_found'; END IF;

  SELECT TRUE INTO v_is_owner FROM public.bookings b
  WHERE b.id = p_booking_id AND (
      EXISTS (
        SELECT 1 FROM public.schedules s
        JOIN public.vehicles v ON s.vehicle_id = v.id
        WHERE s.id = b.schedule_id AND v.owner_id = p_actor_id
      )
      OR EXISTS (
        SELECT 1 FROM public.booking_vehicles bv
        JOIN public.vehicles v ON bv.vehicle_id = v.id
        WHERE bv.booking_id = b.id AND v.owner_id = p_actor_id
      )
    );

  IF NOT v_is_owner THEN RETURN 'unauthorized'; END IF;

  IF p_new_status IN ('approved', 'rejected') AND v_booking.status != 'pending' THEN
    RETURN 'invalid_transition';
  END IF;

  IF p_new_status = 'cancelled' AND v_booking.status != 'approved' THEN
    RETURN 'invalid_transition';
  END IF;

  IF p_new_status = 'cancelled' AND p_reason IS NOT NULL THEN
    UPDATE public.bookings SET status = p_new_status, operator_notes = 'Cancelled by operator: ' || TRIM(p_reason) WHERE id = p_booking_id;
  ELSIF p_new_status = 'rejected' AND p_reason IS NOT NULL THEN
    UPDATE public.bookings SET status = p_new_status, operator_notes = 'Rejected: ' || TRIM(p_reason) WHERE id = p_booking_id;
  ELSE
    UPDATE public.bookings SET status = p_new_status WHERE id = p_booking_id;
  END IF;

  IF p_new_status IN ('rejected', 'cancelled') AND v_booking.schedule_id IS NOT NULL AND v_booking.seats_requested IS NOT NULL THEN
    PERFORM public.restore_seats(v_booking.schedule_id, v_booking.seats_requested);
  END IF;

  RETURN 'success';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- 2. cancel_booking_atomic: For customers to cancel their own pending bookings
CREATE OR REPLACE FUNCTION public.cancel_booking_atomic(
  p_booking_id UUID,
  p_customer_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT b.id, b.status, b.schedule_id, b.seats_requested, b.customer_id
  INTO v_booking FROM public.bookings b
  WHERE b.id = p_booking_id AND b.deleted_at IS NULL;

  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF v_booking.customer_id != p_customer_id THEN RETURN 'unauthorized'; END IF;
  IF v_booking.status != 'pending' THEN RETURN 'not_pending'; END IF;

  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;

  IF v_booking.schedule_id IS NOT NULL AND v_booking.seats_requested IS NOT NULL THEN
    PERFORM public.restore_seats(v_booking.schedule_id, v_booking.seats_requested);
  END IF;

  RETURN 'success';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- 3. Security
REVOKE EXECUTE ON FUNCTION public.update_booking_status_atomic(UUID, TEXT, UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_booking_atomic(UUID, UUID) FROM anon;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
