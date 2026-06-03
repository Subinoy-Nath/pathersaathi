-- Phase 2: Transport Operations Schema

-- routes
CREATE TABLE public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    destination_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
    distance_km DECIMAL(10, 2),
    estimated_duration_mins INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT routes_origin_destination_unique UNIQUE (origin_id, destination_id),
    CONSTRAINT routes_origin_neq_destination CHECK (origin_id != destination_id)
);

-- schedules
CREATE TABLE public.schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    departure_time TIMESTAMPTZ NOT NULL,
    arrival_time TIMESTAMPTZ NOT NULL,
    base_fare DECIMAL(10, 2),
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'boarding', 'in_transit', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT schedules_departure_before_arrival CHECK (departure_time < arrival_time),
    CONSTRAINT schedules_available_seats_positive CHECK (available_seats >= 0),
    CONSTRAINT schedules_available_seats_max CHECK (available_seats <= total_seats)
);

-- Updated_at triggers
CREATE TRIGGER set_routes_updated_at
    BEFORE UPDATE ON public.routes
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

CREATE TRIGGER set_schedules_updated_at
    BEFORE UPDATE ON public.schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();
