-- ============================================================
-- Pather Saathi -- Row Level Security (RLS) Policies
-- File: 003_rls_policies.sql
-- Schema: pathersaathi
-- Run AFTER 002_indexes.sql in Supabase SQL Editor
-- ============================================================
--
-- NOTE: The FastAPI backend uses SUPABASE_SERVICE_ROLE_KEY which
-- BYPASSES RLS. These policies only apply to direct client access
-- (e.g. @supabase/supabase-js with the anon key).
-- Since we use a custom USERS table (not Supabase Auth), auth.uid()
-- won't work out of the box. These serve as a security blueprint.
-- ============================================================

SET search_path TO pathersaathi;


-- 1. Enable RLS on all tables
ALTER TABLE users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;


-- 2. USERS Policies
CREATE POLICY "users_select_all"
  ON users FOR SELECT USING (true);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- 3. VEHICLES Policies
CREATE POLICY "vehicles_select_all"
  ON vehicles FOR SELECT USING (true);

CREATE POLICY "vehicles_insert_owner"
  ON vehicles FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "vehicles_update_owner"
  ON vehicles FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "vehicles_delete_owner"
  ON vehicles FOR DELETE
  USING (owner_id = auth.uid());


-- 4. BOOKINGS Policies
CREATE POLICY "bookings_select_customer"
  ON bookings FOR SELECT
  USING (customer_id = auth.uid());

CREATE POLICY "bookings_select_owner"
  ON bookings FOR SELECT
  USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "bookings_insert_customer"
  ON bookings FOR INSERT
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "bookings_update_owner"
  ON bookings FOR UPDATE
  USING (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    vehicle_id IN (
      SELECT id FROM vehicles WHERE owner_id = auth.uid()
    )
  );


-- Done! Next: Run 004_seed.sql
