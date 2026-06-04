# Technical Debt Register

## Resolved

* **RLS Infinite Recursion Crash (2026-06-03)**: A critical flaw existed where the `bookings` SELECT policy evaluated `booking_vehicles`, and the `booking_vehicles` SELECT policy evaluated `bookings`, causing a recursive crash (`ERROR: 42P17`). This was resolved by implementing a `SECURITY DEFINER` helper function (`public.user_owns_booking()`) that checks booking ownership while bypassing the standard RLS evaluation loop, effectively breaking the cycle. Migration `20260603000019_fix_rls_recursion.sql` applies this fix.

* **Broken RLS and RPC Privileges (2026-06-04)**: Critical access control bug where customers failed to book or cancel tickets because atomic RPC functions (`book_seats`, `cancel_booking_atomic`) were `SECURITY INVOKER`, colliding with strict operator-only `UPDATE` RLS policies on the `schedules` and `bookings` tables. Fixed by shifting RPCs to `SECURITY DEFINER` and maintaining manual authorization checks inside the function bodies (Migration `20260603000020_security_fixes.sql`).

* **Whole Vehicle Booking RLS Block (2026-06-04)**: A logic flaw where customers could not book whole vehicles because inserting into the `booking_vehicles` junction table failed due to operator-only RLS, resulting in orphaned cancelled bookings. Fixed by introducing a single, atomic `SECURITY DEFINER` RPC `book_whole_vehicle_atomic` to handle the entire multi-table transaction securely.

* **Insecure Booking Status API (2026-06-04)**: The `bookings` `INSERT` RLS policy allowed any authenticated user to bypass the frontend UI and directly insert bookings with fraudulent statuses via the REST API (e.g. `status = 'completed'`). Fixed by modifying the RLS policy to strictly enforce `WITH CHECK (customer_id = auth.uid() AND status = 'pending')`.

* **Rate Limit Fail Open (2026-06-04)**: The Upstash Redis rate limiter implementation defaulted to returning `true` (allow) when unconfigured, allowing potential unrestricted API spamming and inventory exhaustion. Fixed in `frontend/src/app/actions.ts` by ensuring the fallback behavior acts safely.
