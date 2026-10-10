-- Migration: Clear all existing scheduled bus runs in database
-- Soft-deletes all existing scheduled, paused, or boarding departures across all fleets.

-- 1. Soft delete all active scheduled departures
UPDATE public.schedules
SET deleted_at = now(),
    status = 'cancelled',
    cancelled_at = now(),
    pause_reason = 'Cleared by operator / system reset'
WHERE deleted_at IS NULL
  AND status IN ('scheduled', 'paused', 'boarding');

-- 2. Deactivate any broadcast notifications attached to schedules
UPDATE public.broadcast_notifications
SET is_active = false,
    updated_at = now()
WHERE is_active = true
  AND schedule_id IS NOT NULL;
