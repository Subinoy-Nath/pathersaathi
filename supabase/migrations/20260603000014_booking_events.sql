-- Phase 6C: Booking Audit Log
-- Tracks every booking status transition with actor, timestamps, and reason.

CREATE TABLE public.booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_booking_events_booking_id ON public.booking_events(booking_id);
CREATE INDEX idx_booking_events_actor_id ON public.booking_events(actor_id);
CREATE INDEX idx_booking_events_created_at ON public.booking_events(created_at);

-- RLS
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

-- Customers can view events on their own bookings
CREATE POLICY "Customers view own booking events"
  ON public.booking_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_events.booking_id AND b.customer_id = auth.uid()
    )
  );

-- Operators can view events on bookings tied to their vehicles
CREATE POLICY "Operators view assigned booking events"
  ON public.booking_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.schedules s ON s.id = b.schedule_id
      JOIN public.vehicles v ON v.id = s.vehicle_id
      WHERE b.id = booking_events.booking_id AND v.owner_id = auth.uid()
    )
  );

-- Only authenticated users can insert events (via server actions)
CREATE POLICY "Authenticated users can insert booking events"
  ON public.booking_events FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
  );

-- Auto-log trigger: fires on every bookings.status change
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed (or is a new insert)
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.booking_events (booking_id, actor_id, from_status, to_status)
    VALUES (
      NEW.id,
      COALESCE(auth.uid(), NEW.customer_id),
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- Attach trigger
CREATE TRIGGER trg_booking_status_change
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_booking_status_change();

-- Block direct RPC access to the trigger function
REVOKE EXECUTE ON FUNCTION public.log_booking_status_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_booking_status_change() FROM authenticated;
