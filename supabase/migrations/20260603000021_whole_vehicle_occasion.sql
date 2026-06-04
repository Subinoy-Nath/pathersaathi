-- Phase 8: Whole Vehicle Booking Enhancements

-- 1. Add occasion column to bookings table
ALTER TABLE public.bookings
ADD COLUMN occasion TEXT;

-- 2. Update the Atomic Whole Vehicle Booking RPC
-- Runs as SECURITY DEFINER to bypass the strict RLS on booking_vehicles
CREATE OR REPLACE FUNCTION public.book_whole_vehicle_atomic(
  p_vehicle_ids UUID[],
  p_travel_date DATE,
  p_occasion TEXT,
  p_customer_id UUID,
  p_booking_reference TEXT
) RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_vehicle_id UUID;
BEGIN
  -- 1. Insert the booking record
  INSERT INTO public.bookings (
    booking_reference,
    customer_id,
    booking_type,
    travel_date,
    occasion,
    status
  ) VALUES (
    p_booking_reference,
    p_customer_id,
    'whole_vehicle',
    p_travel_date,
    p_occasion,
    'pending'
  ) RETURNING id INTO v_booking_id;

  -- 2. Link all vehicles via booking_vehicles
  FOREACH v_vehicle_id IN ARRAY p_vehicle_ids
  LOOP
    INSERT INTO public.booking_vehicles (
      booking_id,
      vehicle_id
    ) VALUES (
      v_booking_id,
      v_vehicle_id
    );
  END LOOP;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- Revoke direct RPC access from anon
REVOKE EXECUTE ON FUNCTION public.book_whole_vehicle_atomic(UUID[], DATE, TEXT, UUID, TEXT) FROM anon;

-- Note: The previous RPC signature (book_whole_vehicle_atomic(UUID[], TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT)) 
-- will remain in the database but will no longer be used by the application. We can DROP it if preferred.
DROP FUNCTION IF EXISTS public.book_whole_vehicle_atomic(UUID[], TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT);
