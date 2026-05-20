# Database — Pather Saathi

SQL migration files for the Supabase PostgreSQL database.  
All objects are created inside the **`pathersaathi`** schema (not the default `public` schema).

## Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to **Dashboard → SQL Editor**

## How to Run

Run each file **in order** by pasting the SQL into the Supabase SQL Editor:

| # | File | What it does |
|---|------|-------------|
| 1 | `001_schema.sql` | Creates `pathersaathi` schema, enums, and 3 tables |
| 2 | `002_indexes.sql` | Adds performance indexes |
| 3 | `003_rls_policies.sql` | Enables Row Level Security policies |
| 4 | `004_seed.sql` | Inserts mock users, vehicles, and bookings |

## Test Credentials

All seed users share the same password for testing:

| Email | Role | Password |
|-------|------|----------|
| `rajesh@aknconstruction.com` | owner | `password123` |
| `amit@shivamcoach.com` | owner | `password123` |
| `priya@example.com` | customer | `password123` |
| `rahul@example.com` | customer | `password123` |

> ⚠️ These are for development only. Never use in production.

## Reset the Database

If you need a clean slate, run `005_reset.sql` first, then re-run 001 → 004.

## Getting Your Credentials

After creating the Supabase project, go to **Settings → API** to find:
- **Project URL** → `SUPABASE_URL`
- **anon public key** → `SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

For the direct DB connection string, go to **Settings → Database → Connection string**.

Copy `.env.local.example` in the project root and fill in your values.
