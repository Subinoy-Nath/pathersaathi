-- Phase 6D: Allow customers to create booking_vehicles entries for their own bookings.
-- The existing policy only allows operators (vehicle owners) to insert.
-- Whole-vehicle booking flow requires customers to link vehicles to their bookings.

CREATE POLICY "Customers can insert booking_vehicles for own bookings"
    ON public.booking_vehicles FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = booking_vehicles.booking_id
              AND b.customer_id = auth.uid()
        )
    );
