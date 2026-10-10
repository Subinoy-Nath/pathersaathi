-- Add origin_name and destination_name columns to routes table.
-- These are auto-populated via a trigger so they never go out of sync
-- with the linked locations records.

-- Step 1: Add the columns
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS origin_name TEXT,
  ADD COLUMN IF NOT EXISTS destination_name TEXT;

-- Step 2: Back-fill all existing rows
UPDATE public.routes r
SET
  origin_name      = lo.name,
  destination_name = ld.name
FROM
  public.locations lo,
  public.locations ld
WHERE
  lo.id = r.origin_id
  AND ld.id = r.destination_id;

-- Step 3: Trigger function to keep names in sync on INSERT / UPDATE
CREATE OR REPLACE FUNCTION public.sync_route_location_names()
RETURNS TRIGGER AS $$
BEGIN
  SELECT name INTO NEW.origin_name
    FROM public.locations WHERE id = NEW.origin_id;

  SELECT name INTO NEW.destination_name
    FROM public.locations WHERE id = NEW.destination_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Attach the trigger
DROP TRIGGER IF EXISTS sync_route_names_trigger ON public.routes;

CREATE TRIGGER sync_route_names_trigger
  BEFORE INSERT OR UPDATE OF origin_id, destination_id
  ON public.routes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_route_location_names();
