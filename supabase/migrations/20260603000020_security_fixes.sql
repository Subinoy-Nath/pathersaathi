-- Phase 7: Security Fixes from Adversarial Audit

-- 1. Fix RPC Privileges to SECURITY DEFINER
-- This allows customers to decrement available_seats and update statuses 
-- (which is strictly controlled by RLS for operators only) without hitting RLS errors.
-- These functions already contain manual authorization checks inside their bodies.
ALTER FUNCTION public.book_seats(UUID, INTEGER) SECURITY DEFINER;
ALTER FUNCTION public.restore_seats(UUID, INTEGER) SECURITY DEFINER;
ALTER FUNCTION public.update_booking_status_atomic(UUID, TEXT, UUID, TEXT) SECURITY DEFINER;
ALTER FUNCTION public.cancel_booking_atomic(UUID, UUID) SECURITY DEFINER;

-- 2. Fix bookings INSERT RLS
-- Drop the old policy
DROP POLICY IF EXISTS "Customers can insert own bookings" ON public.bookings;
-- Create the new strict policy enforcing 'pending' status
CREATE POLICY "Customers can insert own bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (
        customer_id = auth.uid() AND status = 'pending'
    );

-- 3. Create Atomic Whole Vehicle Booking RPC
-- Runs as SECURITY DEFINER to bypass the strict RLS on booking_vehicles 
-- (which normally only allows operators to insert rows).
CREATE OR REPLACE FUNCTION public.book_whole_vehicle_atomic(
  p_vehicle_ids UUID[],
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
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
    start_date,
    end_date,
    status
  ) VALUES (
    p_booking_reference,
    p_customer_id,
    'whole_vehicle',
    p_start_date::DATE, -- Provide travel_date to satisfy NOT NULL constraint
    p_start_date,
    p_end_date,
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
REVOKE EXECUTE ON FUNCTION public.book_whole_vehicle_atomic(UUID[], TIMESTAMPTZ, TIMESTAMPTZ, UUID, TEXT) FROM anon;
