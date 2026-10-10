-- Route Stops: Intermediate stations along a route
-- Supports both locations from the dictionary and custom free-text names.

CREATE TABLE public.route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    custom_name TEXT,
    stop_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Every stop must have at least one of location_id or custom_name
    CONSTRAINT route_stops_name_required CHECK (
        location_id IS NOT NULL OR (custom_name IS NOT NULL AND custom_name != '')
    ),
    -- Unique ordering per route
    CONSTRAINT route_stops_order_unique UNIQUE (route_id, stop_order)
);

-- Updated_at trigger
CREATE TRIGGER set_route_stops_updated_at
    BEFORE UPDATE ON public.route_stops
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;

-- Anyone can read stops for active routes
CREATE POLICY "Anyone can view route stops"
    ON public.route_stops FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.routes r
            WHERE r.id = route_id
              AND r.deleted_at IS NULL
              AND r.is_active = true
        )
    );

-- Verified operators can insert stops for routes they own
CREATE POLICY "Operators can insert stops for their routes"
    ON public.route_stops FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.routes r
            JOIN public.users u ON r.owner_id = u.id
            WHERE r.id = route_id
              AND u.id = auth.uid()
              AND u.role = 'operator'
              AND u.verification_status = 'verified'
        )
    );

-- Verified operators can update stops for routes they own
CREATE POLICY "Operators can update stops for their routes"
    ON public.route_stops FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.routes r
            JOIN public.users u ON r.owner_id = u.id
            WHERE r.id = route_id
              AND u.id = auth.uid()
              AND u.role = 'operator'
              AND u.verification_status = 'verified'
        )
    );

-- Verified operators can delete stops for routes they own
CREATE POLICY "Operators can delete stops for their routes"
    ON public.route_stops FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.routes r
            JOIN public.users u ON r.owner_id = u.id
            WHERE r.id = route_id
              AND u.id = auth.uid()
              AND u.role = 'operator'
              AND u.verification_status = 'verified'
        )
    );

-- Index for fast stop lookup by route
CREATE INDEX route_stops_route_id_idx ON public.route_stops(route_id, stop_order);
