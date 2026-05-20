-- ============================================================
-- Pather Saathi -- Performance Indexes
-- File: 002_indexes.sql
-- Schema: pathersaathi
-- Run AFTER 001_schema.sql in Supabase SQL Editor
-- ============================================================

SET search_path TO pathersaathi;

-- USERS
CREATE INDEX idx_users_role ON users(role);

-- VEHICLES
CREATE INDEX idx_vehicles_owner_id ON vehicles(owner_id);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_is_available ON vehicles(is_available);
CREATE INDEX idx_vehicles_type_available ON vehicles(type, is_available);

-- BOOKINGS
CREATE INDEX idx_bookings_vehicle_id ON bookings(vehicle_id);
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_vehicle_status ON bookings(vehicle_id, status);


-- Done! Next: Run 003_rls_policies.sql
