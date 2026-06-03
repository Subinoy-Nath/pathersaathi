-- Phase 3: Booking System RLS and Policies

-- Enable RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_vehicles ENABLE ROW LEVEL SECURITY;

-- BOOKINGS
-- Customers can view their own bookings. Operators can view bookings assigned to their vehicles.
CREATE POLICY "Customers view own bookings, Operators view assigned bookings"
    ON public.bookings FOR SELECT
    USING (
        customer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.schedules s 
            JOIN public.vehicles v ON s.vehicle_id = v.id 
            WHERE s.id = bookings.schedule_id AND v.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.booking_vehicles bv 
            JOIN public.vehicles v ON bv.vehicle_id = v.id 
            WHERE bv.booking_id = bookings.id AND v.owner_id = auth.uid()
        )
    );

-- Customers can insert their own bookings
CREATE POLICY "Customers can insert own bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (
        customer_id = auth.uid()
    );

-- Operators can update bookings assigned to their vehicles, Customers can cancel their bookings
CREATE POLICY "Operators update assigned, Customers update own"
    ON public.bookings FOR UPDATE
    USING (
        (customer_id = auth.uid() AND status = 'pending') OR
        EXISTS (
            SELECT 1 FROM public.schedules s 
            JOIN public.vehicles v ON s.vehicle_id = v.id 
            WHERE s.id = bookings.schedule_id AND v.owner_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.booking_vehicles bv 
            JOIN public.vehicles v ON bv.vehicle_id = v.id 
            WHERE bv.booking_id = bookings.id AND v.owner_id = auth.uid()
        )
    );

-- BOOKING_VEHICLES
-- Customers can view booking_vehicles for their own bookings. Operators view for their own vehicles.
CREATE POLICY "Customers view own booking_vehicles, Operators view own"
    ON public.booking_vehicles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_vehicles.booking_id AND b.customer_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.vehicles v 
            WHERE v.id = booking_vehicles.vehicle_id AND v.owner_id = auth.uid()
        )
    );

-- Only Operators can insert/update booking_vehicles for their own vehicles
CREATE POLICY "Operators can manage booking_vehicles for their vehicles"
    ON public.booking_vehicles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.vehicles v 
            WHERE v.id = booking_vehicles.vehicle_id AND v.owner_id = auth.uid()
        )
    );
