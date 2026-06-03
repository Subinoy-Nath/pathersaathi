-- Phase 3: Booking System Schema

-- bookings
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    booking_type TEXT NOT NULL CHECK (booking_type IN ('ticket', 'whole_vehicle')),
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE RESTRICT,
    travel_date DATE NOT NULL,
    seats_requested INTEGER,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    total_price DECIMAL(10, 2),
    operator_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT bookings_ticket_schedule_required CHECK (
        (booking_type = 'ticket' AND schedule_id IS NOT NULL AND seats_requested IS NOT NULL) OR 
        (booking_type = 'whole_vehicle')
    )
);

-- booking_vehicles (for whole vehicle bookings and multi-vehicle assignments)
CREATE TABLE public.booking_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT booking_vehicles_unique UNIQUE (booking_id, vehicle_id)
);

-- Indexes for performance
CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX idx_bookings_schedule_id ON public.bookings(schedule_id);
CREATE INDEX idx_bookings_travel_date ON public.bookings(travel_date);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_schedules_status ON public.schedules(status);
CREATE INDEX idx_vehicles_owner_id ON public.vehicles(owner_id);

-- Updated_at triggers
CREATE TRIGGER set_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_booking_vehicles_updated_at
    BEFORE UPDATE ON public.booking_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
