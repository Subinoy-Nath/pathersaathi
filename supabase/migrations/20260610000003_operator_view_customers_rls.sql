-- Migration: Allow Operators to view customer profiles
-- Description: Fixes the issue where operators see "Guest / N/A" because RLS filters out customer profiles during booking joins.

-- 1. Create a helper function to safely check if the current user is an operator
--    This must be SECURITY DEFINER to bypass RLS and avoid infinite recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- 2. Add a new policy to the users table
--    This allows any user with the 'operator' or 'admin' role to SELECT any profile.
CREATE POLICY "Operators and Admins can view all user profiles"
    ON public.users FOR SELECT
    USING (
        public.get_current_user_role() IN ('operator', 'admin')
    );
