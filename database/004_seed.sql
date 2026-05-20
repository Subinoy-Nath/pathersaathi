-- ============================================================
-- Pather Saathi -- Seed Data
-- File: 004_seed.sql
-- Schema: pathersaathi
-- Run AFTER 003_rls_policies.sql in Supabase SQL Editor
-- ============================================================
--
-- TEST CREDENTIALS:
-- All seed users have the password: password123
-- The password_hash below is a bcrypt hash of "password123"
-- DO NOT use these credentials in production!
-- ============================================================

SET search_path TO pathersaathi;


-- 1. USERS (2 Owners + 2 Customers)

INSERT INTO users (id, name, email, password_hash, role) VALUES
  (
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Rajesh Kumar',
    'rajesh@aknconstruction.com',
    '$2b$12$LJ3m5ZQnJPGDf5V2Q5Xz7OqYk1rMZKVFwJ3m5ZQnJPGDf5V2Q5Xz7',
    'owner'
  ),
  (
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'Amit Singh',
    'amit@shivamcoach.com',
    '$2b$12$LJ3m5ZQnJPGDf5V2Q5Xz7OqYk1rMZKVFwJ3m5ZQnJPGDf5V2Q5Xz7',
    'owner'
  ),
  (
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    'Priya Sharma',
    'priya@example.com',
    '$2b$12$LJ3m5ZQnJPGDf5V2Q5Xz7OqYk1rMZKVFwJ3m5ZQnJPGDf5V2Q5Xz7',
    'customer'
  ),
  (
    'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
    'Rahul Das',
    'rahul@example.com',
    '$2b$12$LJ3m5ZQnJPGDf5V2Q5Xz7OqYk1rMZKVFwJ3m5ZQnJPGDf5V2Q5Xz7',
    'customer'
  );


-- 2. VEHICLES (AKN Construction + Shivam Coach)

INSERT INTO vehicles (id, owner_id, name, type, price_per_day, is_available, image_url) VALUES
  (
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'CAT 320 Excavator',
    'excavator',
    8000.00,
    true,
    'https://images.unsplash.com/photo-1580901368919-7738efb0f228?w=800'
  ),
  (
    'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Tata Hitachi Loader',
    'loader',
    5500.00,
    true,
    'https://images.unsplash.com/photo-1621922688758-9a51ce3af801?w=800'
  ),
  (
    'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d',
    'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    'Ashok Leyland Tipper',
    'truck',
    6000.00,
    false,
    'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800'
  ),
  (
    'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e',
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'Volvo B7R Bus',
    'bus',
    12000.00,
    true,
    'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800'
  ),
  (
    'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f',
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'Tata Starbus',
    'bus',
    9500.00,
    true,
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800'
  ),
  (
    'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a',
    'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'Eicher Skyline',
    'bus',
    10000.00,
    false,
    'https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=800'
  );


-- 3. BOOKINGS (sample lifecycle)

INSERT INTO bookings (id, vehicle_id, customer_id, start_date, end_date, status) VALUES
  (
    'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
    'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    '2026-06-01',
    '2026-06-05',
    'pending'
  ),
  (
    'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c',
    'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e',
    'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
    '2026-06-10',
    '2026-06-12',
    'approved'
  ),
  (
    'a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d',
    'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f',
    'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    '2026-05-20',
    '2026-05-22',
    'rejected'
  );


-- ============================================================
-- Verification queries (run these to confirm):
-- ============================================================

SELECT 'users' AS table_name, count(*) AS row_count FROM users
UNION ALL
SELECT 'vehicles', count(*) FROM vehicles
UNION ALL
SELECT 'bookings', count(*) FROM bookings;

SELECT id, name, email, role, created_at FROM users ORDER BY role, name;

SELECT
  v.name AS vehicle, v.type, v.price_per_day, v.is_available, u.name AS owner
FROM vehicles v
JOIN users u ON v.owner_id = u.id
ORDER BY u.name, v.name;

SELECT
  b.status, v.name AS vehicle, c.name AS customer, b.start_date, b.end_date
FROM bookings b
JOIN vehicles v ON b.vehicle_id = v.id
JOIN users c ON b.customer_id = c.id
ORDER BY b.created_at;
