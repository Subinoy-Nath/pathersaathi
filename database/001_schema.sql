-- ============================================================
-- Pather Saathi -- Schema Migration
-- File: 001_schema.sql
-- Schema: pathersaathi
-- Run this FIRST in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Create and switch to the pathersaathi schema
CREATE SCHEMA IF NOT EXISTS pathersaathi;
SET search_path TO pathersaathi;


-- ============================================================
-- USERS Table
-- ============================================================
-- Stores both customers and fleet owners.
-- Authentication is handled by the FastAPI backend (not Supabase Auth).
-- role must be either 'customer' or 'owner'.

CREATE TABLE users (
  id             UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT         NOT NULL,
  email          TEXT         NOT NULL UNIQUE,
  password_hash  TEXT         NOT NULL,
  role           TEXT         NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'owner')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);


-- ============================================================
-- VEHICLES Table
-- ============================================================
-- Each vehicle belongs to one owner.
-- type must be one of: bus, excavator, truck, loader

CREATE TABLE vehicles (
  id             UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT          NOT NULL,
  type           TEXT          NOT NULL CHECK (type IN ('bus', 'excavator', 'truck', 'loader')),
  price_per_day  NUMERIC(10,2) NOT NULL CHECK (price_per_day > 0),
  is_available   BOOLEAN       NOT NULL DEFAULT true,
  image_url      TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);


-- ============================================================
-- BOOKINGS Table
-- ============================================================
-- A customer requests a booking; the vehicle owner approves or rejects it.
-- status must be one of: pending, approved, rejected

CREATE TABLE bookings (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id     UUID        NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date     DATE        NOT NULL,
  end_date       DATE        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT     valid_date_range CHECK (end_date >= start_date)
);


-- ============================================================
-- Done! Next: Run 002_indexes.sql
-- ============================================================
