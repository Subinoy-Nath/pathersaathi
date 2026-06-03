-- Phase 6B: Add owner_id to routes for multi-tenant route ownership
-- Applied manually via: supabase db push --linked

-- 1. Add owner_id column (nullable for legacy seeded routes)
ALTER TABLE public.routes
    ADD COLUMN owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 2. Create index for owner_id lookups
CREATE INDEX idx_routes_owner_id ON public.routes(owner_id);

-- 3. Drop the old INSERT policy that allowed any operator to insert routes
DROP POLICY IF EXISTS "Operators can insert routes" ON public.routes;

-- 4. New INSERT policy: operators can only insert routes they own
CREATE POLICY "Operators can insert their own routes"
    ON public.routes FOR INSERT
    WITH CHECK (
        owner_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'operator' AND verification_status = 'verified'
        )
    );

-- 5. UPDATE policy: operators can only update routes they own
CREATE POLICY "Operators can update their own routes"
    ON public.routes FOR UPDATE
    USING (
        owner_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- 6. DELETE policy: operators can only delete routes they own
CREATE POLICY "Operators can delete their own routes"
    ON public.routes FOR DELETE
    USING (
        owner_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Note: The existing SELECT policy "Anyone can view active routes" remains unchanged.
-- Seeded routes with owner_id = NULL are SELECT-only for operators (they cannot UPDATE/DELETE them).
