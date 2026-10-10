-- Add is_ac to vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_ac BOOLEAN NOT NULL DEFAULT false;

-- Create fares table
CREATE TABLE public.fares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    destination_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    is_ac BOOLEAN NOT NULL DEFAULT false,
    fare_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fares_origin_destination_is_ac_unique UNIQUE (origin_id, destination_id, is_ac)
);

-- Trigger for updated_at
CREATE TRIGGER set_fares_updated_at
    BEFORE UPDATE ON public.fares
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- RLS
ALTER TABLE public.fares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fares" ON public.fares FOR SELECT USING (true);

CREATE POLICY "Operators and admins can modify fares" ON public.fares
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'operator')
        )
    );

