# Pather Saathi

Fleet booking platform for Barak Valley, built on Next.js 16 and Supabase.

🌐 **Website**: [pathersaathi.in](https://pathersaathi.in)  
📧 **Support**: [support@pathersaathi.in](mailto:support@pathersaathi.in)

## Tech Stack

- **Frontend**: Next.js 16 (App Router, Server Components, Server Actions)
- **Database**: Supabase (PostgreSQL 14.5, Row-Level Security)
- **Auth**: Supabase SSR with HTTP-only cookies (`@supabase/ssr`)
- **Deployment**: Vercel (production), Supabase Cloud (database)

## Getting Started (Local Development)

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:3000`.

### Environment Variables

Create `frontend/.env.local` for local development:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Never commit `.env` files to git.** Production variables are set in the Vercel dashboard.

## Deployment

### Vercel (Frontend)

Deploys automatically on push to `main` via GitHub integration.

**Required environment variables in Vercel Dashboard:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never exposed to client)
- `UPSTASH_REDIS_REST_URL` (optional — rate limiting, degrades gracefully if absent)
- `UPSTASH_REDIS_REST_TOKEN` (optional — rate limiting)

### Database Migrations

Migrations live in `supabase/migrations/` and are **NOT** applied automatically by Vercel builds.

To apply migrations to the production (cloud) database:

```bash
# Link to your Supabase project (one-time setup)
supabase link --project-ref YOUR_PROJECT_REF

# Push all pending migrations
supabase db push --linked
```

**Migration order matters.** Files are applied in alphabetical order by timestamp prefix.

### Current Migrations

| File | Description |
|---|---|
| `000001_core_schema.sql` | Users, locations, vehicles tables |
| `000002_rls_policies_and_triggers.sql` | RLS + privilege escalation trigger |
| `000003_seed_frontend_data.sql` | Seed operator, vehicles, locations |
| `000004_auth_trigger.sql` | Auth trigger (superseded by 000010) |
| `000005_routes_schedules_schema.sql` | Routes and schedules tables |
| `000006_routes_schedules_rls.sql` | RLS for routes and schedules |
| `000007_seed_routes_schedules.sql` | Seed routes and schedules |
| `000008_bookings_schema.sql` | Bookings and booking_vehicles tables |
| `000009_bookings_rls.sql` | RLS for bookings |
| `000010_auth_trigger.sql` | Idempotent auth trigger with field whitelisting |
| `000011_add_route_owner.sql` | Adds `owner_id` to routes for multi-tenant ownership |
| `000012_security_hardening.sql` | Revokes EXECUTE on trigger functions, pins search_path |
| `000013_atomic_seat_booking.sql` | `book_seats()` + `restore_seats()` atomic functions |
| `000014_booking_events.sql` | `booking_events` audit table + trigger |
| `000015_booking_expiry.sql` | `expire_stale_bookings()` function |
| `000016_atomic_booking_status.sql` | `update_booking_status_atomic()` + `cancel_booking_atomic()` |
| `000016_whole_vehicle_booking_rls.sql` | Customer INSERT policy for booking_vehicles |
| `000017_atomic_booking_update.sql` | Atomic operator state transitions |
| `000018_enable_pg_cron.sql` | Hourly cron for stale booking cleanup |
| `000019_fix_rls_recursion.sql` | `user_owns_booking()` helper to break RLS recursion |

## Security Model

- **Identity**: Always derived server-side via `supabase.auth.getUser()`. Never `getSession()`.
- **Authorization**: RBAC via `public.users.role` (`admin`/`operator`/`customer`).
- **Trust boundary**: Server Actions + RLS. Client components are presentation-only.
- **Privilege escalation prevention**: PostgreSQL trigger blocks role/verification_status changes by authenticated users.
- **Field whitelisting**: All mutations explicitly map allowed fields. No payload spreading.
- **Phone validation**: Strict `+91XXXXXXXXXX` format enforced server-side (security for wa.me links).
- **Rate limiting**: Booking creation is rate-limited (3 requests / 60 seconds per user via Upstash Redis sliding window).
- **Atomic operations**: Booking status transitions and seat allocation use PostgreSQL RPC functions to prevent race conditions.
- **Audit logging**: All booking status changes are automatically logged to `booking_events` via trigger.

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── auth/actions.ts          # Logout action
│   │   ├── bookings/                # Customer booking dashboard
│   │   ├── login/                   # Auth (login + signup toggle)
│   │   ├── operator/                # Operator dashboard
│   │   │   └── fleet/               # Fleet management (vehicles, routes, schedules)
│   │   ├── profile/                 # User profile management
│   │   ├── actions.ts               # Ticket + Whole-vehicle booking actions
│   │   ├── HomeClient.tsx           # Homepage client component
│   │   └── page.tsx                 # Homepage server component
│   ├── components/
│   │   ├── Navbar.tsx               # Client navbar with role-aware navigation
│   │   ├── NavbarServer.tsx         # Server component wrapper for navbar
│   │   ├── BookingActionButtons.tsx  # Operator approve/reject/cancel buttons
│   │   └── CustomerCancelButton.tsx  # Customer cancel booking button
│   ├── lib/ratelimit.ts             # Upstash Redis rate limiter (graceful degradation)
│   ├── types/database.types.ts      # Auto-generated Supabase types
│   └── utils/supabase/              # Supabase client utilities
├── public/images/                   # Static bus images
└── package.json
supabase/
└── migrations/                      # SQL migration files
docs/
├── PROJECT_ARTIFACT.md              # Architecture documentation
└── SECURITY_REVIEW_PHASE_6B.md      # Adversarial threat model
```
