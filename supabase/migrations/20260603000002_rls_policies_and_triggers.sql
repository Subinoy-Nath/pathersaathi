-- RLS and Triggers for Core Foundation

-- 1. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 2. Privilege Escalation Prevention Trigger (users)
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow changes to role or verification_status if the session user is authenticated/anon (meaning client-side)
    -- Service role or postgres role can bypass this
    IF (current_setting('role') IN ('authenticated', 'anon')) THEN
        IF (NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION 'Not authorized to change role';
        END IF;
        IF (NEW.verification_status IS DISTINCT FROM OLD.verification_status) THEN
            RAISE EXCEPTION 'Not authorized to change verification_status';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_role_escalation
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_escalation();

-- 3. RLS Policies

-- USERS
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- LOCATIONS
-- Everyone (including anon) can view locations
CREATE POLICY "Anyone can view active locations"
    ON public.locations FOR SELECT
    USING (deleted_at IS NULL);
-- No insert/update/delete from clients for locations

-- VEHICLES
-- Everyone can view active vehicles
CREATE POLICY "Anyone can view active vehicles"
    ON public.vehicles FOR SELECT
    USING (deleted_at IS NULL AND is_active = true);

-- Operators can insert their own vehicles
CREATE POLICY "Operators can insert their own vehicles"
    ON public.vehicles FOR INSERT
    WITH CHECK (
        auth.uid() = owner_id AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );

-- Operators can update their own vehicles
CREATE POLICY "Operators can update their own vehicles"
    ON public.vehicles FOR UPDATE
    USING (
        auth.uid() = owner_id AND 
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'operator'
        )
    );
