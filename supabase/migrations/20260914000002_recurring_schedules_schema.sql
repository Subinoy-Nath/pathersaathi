-- Migration: 20260914000002_recurring_schedules_schema.sql
-- Description: Create recurring_schedule_templates, link to schedules, expand status to 'paused'.

BEGIN;

-- 1. Create recurring_schedule_templates
CREATE TABLE IF NOT EXISTS public.recurring_schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE RESTRICT,
    default_driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    departure_time TIME NOT NULL,
    estimated_duration_mins INTEGER NOT NULL,
    days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6,0}', -- 0=Sun, 1=Mon ... 6=Sat
    base_fare DECIMAL(10, 2) NOT NULL CHECK (base_fare >= 0),
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    is_paused BOOLEAN NOT NULL DEFAULT false,
    pause_reason TEXT,
    paused_until DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT templates_vehicle_route_dep_uniq UNIQUE (vehicle_id, route_id, departure_time)
);

CREATE INDEX IF NOT EXISTS idx_rec_templates_operator ON public.recurring_schedule_templates(operator_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rec_templates_active ON public.recurring_schedule_templates(is_paused) WHERE deleted_at IS NULL AND is_paused = false;

ALTER TABLE public.recurring_schedule_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators manage own recurring templates" ON public.recurring_schedule_templates;
CREATE POLICY "Operators manage own recurring templates"
    ON public.recurring_schedule_templates
    FOR ALL TO authenticated
    USING (operator_id = auth.uid())
    WITH CHECK (operator_id = auth.uid());

-- 2. Expand schedules status check to include 'paused'
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_status_check
    CHECK (status IN ('scheduled', 'boarding', 'in_transit', 'completed', 'cancelled', 'paused'));

-- 3. Add template and pause columns to schedules
ALTER TABLE public.schedules 
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.recurring_schedule_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS pause_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_template_id ON public.schedules(template_id);

COMMIT;
