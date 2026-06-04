-- Phase 9: Search Path Hardening
-- This migration explicitly locks down the search_path for SECURITY DEFINER functions 
-- to prevent search path hijacking (CVE-2018-1058).

ALTER FUNCTION public.prevent_role_escalation() SET search_path = public;
ALTER FUNCTION public.book_seats(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.restore_seats(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.update_booking_status_atomic(UUID, TEXT, UUID, TEXT) SET search_path = public;
ALTER FUNCTION public.cancel_booking_atomic(UUID, UUID) SET search_path = public;
