# Database Development Scope

## Overview
Pather Saathi uses a managed PostgreSQL database hosted on Supabase. Supabase handles not just the data storage, but also offers built-in Authentication and Storage (for vehicle images), making it the central source of truth for the platform.

## Tech Stack
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth (Email/Password)
- **Storage:** Supabase Storage buckets

## Core Schema Definition

### 1. USERS Table
Stores user profiles and roles.
- `id`: UUID (Primary Key, matches Supabase Auth UID)
- `name`: VARCHAR
- `email`: VARCHAR (Unique)
- `password_hash`: (Handled by Supabase Auth, but kept in schema notes for reference)
- `role`: ENUM ('customer', 'owner')
- `created_at`: TIMESTAMP WITH TIME ZONE

### 2. VEHICLES Table
Stores the fleet for AKN Construction and Shivam Coach.
- `id`: UUID (Primary Key)
- `owner_id`: UUID (Foreign Key -> USERS.id)
- `name`: VARCHAR
- `type`: ENUM ('bus', 'excavator', 'truck', 'loader')
- `price_per_day`: DECIMAL or INTEGER
- `is_available`: BOOLEAN (Default: true)
- `image_url`: VARCHAR (URL pointing to Supabase Storage)

### 3. BOOKINGS Table
Tracks booking requests and their status.
- `id`: UUID (Primary Key)
- `vehicle_id`: UUID (Foreign Key -> VEHICLES.id)
- `customer_id`: UUID (Foreign Key -> USERS.id)
- `start_date`: DATE
- `end_date`: DATE
- `status`: ENUM ('pending', 'approved', 'rejected') (Default: 'pending')
- `created_at`: TIMESTAMP WITH TIME ZONE

## Security & Policies
- **Row Level Security (RLS):**
  - Setup RLS policies so customers can only see their own bookings.
  - Owners can see all bookings related to their `vehicle_id`.
  - Vehicles are publicly readable, but only owners can insert/update them.

## Setup Tasks
- Initialize Supabase project.
- Execute SQL scripts to create tables and ENUMs.
- Setup Storage bucket `vehicle-images` and configure public read access.
