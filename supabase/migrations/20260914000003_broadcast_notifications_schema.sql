-- Migration: 20260914000003_broadcast_notifications_schema.sql
-- Description: Create broadcast_notifications table, RLS, and Realtime publication.

BEGIN;

CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('service_disruption', 'delay', 'weather', 'road_closure', 'general')),
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_active ON public.broadcast_notifications(is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_broadcasts_route ON public.broadcast_notifications(route_id) WHERE is_active = true;

ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read active broadcasts" ON public.broadcast_notifications;
CREATE POLICY "Public read active broadcasts"
    ON public.broadcast_notifications
    FOR SELECT TO anon, authenticated
    USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

DROP POLICY IF EXISTS "Operators manage own broadcasts" ON public.broadcast_notifications;
CREATE POLICY "Operators manage own broadcasts"
    ON public.broadcast_notifications
    FOR ALL TO authenticated
    USING (operator_id = auth.uid())
    WITH CHECK (operator_id = auth.uid());

-- Realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'broadcast_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_notifications;
    END IF;
END $$;

COMMIT;
