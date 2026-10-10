-- Migration: Fix schedules RLS policies and add SECURITY DEFINER helper functions
-- Solves "new row violates row-level security policy for table 'schedules'" during updates and deletions

-- 1. Helper function to check if current authenticated user owns the vehicle of a schedule
CREATE OR REPLACE FUNCTION public.operator_owns_vehicle(p_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = p_vehicle_id
      AND v.owner_id = auth.uid()
  );
$$;

-- 2. Drop legacy schedules policies
DROP POLICY IF EXISTS "Operators can update schedules for their vehicles" ON public.schedules;
DROP POLICY IF EXISTS "Operators can delete schedules for their vehicles" ON public.schedules;

-- 3. Recreate clean UPDATE policy using SECURITY DEFINER helper
CREATE POLICY "Operators can update schedules for their vehicles"
    ON public.schedules FOR UPDATE
    USING (public.operator_owns_vehicle(vehicle_id))
    WITH CHECK (public.operator_owns_vehicle(vehicle_id));

-- 4. Add DELETE policy for schedules
CREATE POLICY "Operators can delete schedules for their vehicles"
    ON public.schedules FOR DELETE
    USING (public.operator_owns_vehicle(vehicle_id));

-- 5. Add RPC for atomic batch clearing of operator schedules
CREATE OR REPLACE FUNCTION public.clear_operator_schedules(p_vehicle_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verify all requested vehicle IDs belong to the calling operator
  IF EXISTS (
    SELECT 1 FROM unnest(p_vehicle_ids) AS vid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = vid AND v.owner_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized: One or more vehicles do not belong to current operator.';
  END IF;

  -- Soft delete active/scheduled departures
  UPDATE public.schedules
  SET deleted_at = now(),
      status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      pause_reason = 'Cleared by operator',
      updated_at = now()
  WHERE vehicle_id = ANY(p_vehicle_ids)
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Deactivate associated broadcasts
  UPDATE public.broadcast_notifications
  SET is_active = false,
      updated_at = now()
  WHERE operator_id = auth.uid()
    AND is_active = true;

  RETURN v_count;
END;
$$;

-- 6. Add RPC for atomic deletion of a single schedule run
CREATE OR REPLACE FUNCTION public.delete_single_schedule_run(p_schedule_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_id UUID;
BEGIN
  -- Get vehicle_id of schedule
  SELECT vehicle_id INTO v_vehicle_id
  FROM public.schedules
  WHERE id = p_schedule_id;

  IF v_vehicle_id IS NULL THEN
    RAISE EXCEPTION 'Schedule not found.';
  END IF;

  -- Verify operator owns vehicle
  IF NOT EXISTS (
    SELECT 1 FROM public.vehicles
    WHERE id = v_vehicle_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this schedule.';
  END IF;

  -- Soft delete the schedule
  UPDATE public.schedules
  SET deleted_at = now(),
      status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      pause_reason = 'Cancelled by operator',
      updated_at = now()
  WHERE id = p_schedule_id;

  -- Deactivate attached broadcasts
  UPDATE public.broadcast_notifications
  SET is_active = false,
      updated_at = now()
  WHERE schedule_id = p_schedule_id;

  RETURN true;
END;
$$;
