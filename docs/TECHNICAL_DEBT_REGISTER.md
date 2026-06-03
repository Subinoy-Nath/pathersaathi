# Technical Debt Register

## Resolved

* **RLS Infinite Recursion Crash (2026-06-03)**: A critical flaw existed where the `bookings` SELECT policy evaluated `booking_vehicles`, and the `booking_vehicles` SELECT policy evaluated `bookings`, causing a recursive crash (`ERROR: 42P17`). This was resolved by implementing a `SECURITY DEFINER` helper function (`public.user_owns_booking()`) that checks booking ownership while bypassing the standard RLS evaluation loop, effectively breaking the cycle. Migration `20260603000019_fix_rls_recursion.sql` applies this fix.
