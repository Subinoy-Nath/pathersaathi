-- Phase 2: Transport Operations RLS and Policies

-- Enable RLS
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- ROUTES
-- Everyone can view active routes
CREATE POLICY "Anyone can view active routes"
    ON public.routes FOR SELECT
    USING (deleted_at IS NULL AND is_active = true);

-- Any verified operator can insert a new route
CREATE POLICY "Operators can insert routes"
    ON public.routes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'operator' AND verification_status = 'verified'
        )
    );

-- SCHEDULES
-- Everyone can view active schedules
CREATE POLICY "Anyone can view active schedules"
    ON public.schedules FOR SELECT
    USING (deleted_at IS NULL AND status != 'cancelled');

-- Operators can insert schedules for their own vehicles
CREATE POLICY "Operators can insert schedules for their vehicles"
    ON public.schedules FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            JOIN public.users u ON v.owner_id = u.id
            WHERE v.id = vehicle_id AND u.id = auth.uid() AND u.role = 'operator'
        )
    );

-- Operators can update schedules for their own vehicles
CREATE POLICY "Operators can update schedules for their vehicles"
    ON public.schedules FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.vehicles v
            JOIN public.users u ON v.owner_id = u.id
            WHERE v.id = vehicle_id AND u.id = auth.uid() AND u.role = 'operator'
        )
    );
