-- ============================================================
-- Pather Saathi -- RESET / DROP ALL
-- File: 005_reset.sql
-- Schema: pathersaathi
-- WARNING: This will DELETE all tables and data!
-- After running this, re-run 001 > 002 > 003 > 004 in order.
-- ============================================================

SET search_path TO pathersaathi;

DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS users    CASCADE;

-- Uncomment below for a full schema wipe:
-- DROP SCHEMA IF EXISTS pathersaathi CASCADE;
