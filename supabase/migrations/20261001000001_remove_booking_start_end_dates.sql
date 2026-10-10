-- Migration: Remove legacy start_date and end_date columns from bookings table
-- Standardizes all bookings (ticket and whole_vehicle) to use the single 'travel_date' column.

-- 1. Backfill travel_date from start_date for any historical records where travel_date was NULL
UPDATE public.bookings
SET travel_date = start_date::DATE
WHERE travel_date IS NULL AND start_date IS NOT NULL;

-- 2. Drop the redundant start_date and end_date columns
ALTER TABLE public.bookings
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date;
