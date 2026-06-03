-- Phase 6B Security Hardening: Revoke public EXECUTE on SECURITY DEFINER functions
-- These functions are trigger-only and must NOT be callable via /rest/v1/rpc/

-- handle_new_user: auth trigger only
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- prevent_role_escalation: trigger only
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM authenticated;

-- set_current_timestamp_updated_at: trigger only, also pin search_path
ALTER FUNCTION public.set_current_timestamp_updated_at() SET search_path = public;
ALTER FUNCTION public.prevent_role_escalation() SET search_path = public;
