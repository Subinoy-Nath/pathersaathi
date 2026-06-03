-- Phase 6F: Fix RLS Infinite Recursion
-- This migration creates a SECURITY DEFINER helper function to safely check
-- booking ownership without triggering RLS policies recursively.
-- It then updates the booking_vehicles policies to use this function.

CREATE OR REPLACE FUNCTION public.user_owns_booking(booking_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE id = booking_uuid
    AND customer_id = auth.uid()
  );
$$;

-- Drop the recursive SELECT policy
DROP POLICY IF EXISTS "Customers view own booking_vehicles, Operators view own" ON public.booking_vehicles;

-- Recreate using the helper function
CREATE POLICY "Customers view own booking_vehicles, Operators view own"
    ON public.booking_vehicles FOR SELECT
    USING (
        public.user_owns_booking(booking_id) OR
        EXISTS (
            SELECT 1 FROM public.vehicles v 
            WHERE v.id = booking_vehicles.vehicle_id AND v.owner_id = auth.uid()
        )
    );

-- Also update the INSERT policy to use the helper function to avoid any latent recursion risks
DROP POLICY IF EXISTS "Customers can insert booking_vehicles for own bookings" ON public.booking_vehicles;

CREATE POLICY "Customers can insert booking_vehicles for own bookings"
    ON public.booking_vehicles FOR INSERT
    WITH CHECK (
        public.user_owns_booking(booking_id)
    );
