# Pather Saathi - Project Artifact

## Executive Summary
* **Project Purpose**: Pather Saathi is a fleet booking platform tailored for operators and customers in Barak Valley. It enables customers to discover, book, and communicate (via WhatsApp) for bus tickets or whole-vehicle reservations. Operators manage their fleet and schedules via a secure dashboard.
* **Current Implementation Status**: Production Hardening Sprint Complete. Booking pipeline is concurrency-safe (atomic seat allocation), auditable (booking_events), and operationally complete (operator cancellation + booking expiry). Whole-vehicle booking flow is fully operational and rate-limited.
* **Current Milestone**: Production Hardening (Phase 1 & Phase 2) — implemented, deployed, and build-verified.
* **Active Priorities**: Production deployment monitoring and final validation.
* **Known Limitations**: Images are stored as static URLs (`/images/`) instead of Supabase Storage buckets. WhatsApp integration uses deep-linking (`wa.me`) rather than the official WhatsApp Business API.

---

## Current Deployment Status
* **Database**: Supabase Cloud project. 18 migrations applied (core schema through whole-vehicle RLS and atomic updates). Auth trigger `handle_new_user` active with field whitelisting.
* **Frontend**: Next.js 16.2.6 (Turbopack). Build passes with zero type errors. All routes compile successfully.
* **Auth Status**: Working. Sign up handles user/metadata copying via idempotent PostgreSQL trigger with whitelisted fields (`name`, `phone_number`).
* **Booking Status**: End-to-end operational for both tickets and whole-vehicle bookings.
* **Operator Dashboard**: `/operator` active with RBAC guard. Includes Approve/Reject actions and whole-vehicle booking visibility.
* **Customer Dashboard**: `/bookings` active, showing booking status, reference, whole-vehicle details, and direct WhatsApp links.
* **Profile Management**: `/profile` active. Users can update name and phone number (strict +91 validation).
* **Fleet Management**: `/operator/fleet` active. Operators can manage vehicles, create owned routes, and schedule services.
* **Deployment Target**: Vercel (automatic deploys on push to `main`). Database migrations applied manually via `supabase db push --linked`.

---

## Architecture Overview
* **System Architecture**: Two-tier client-serverless architecture. Next.js 15+ (App Router) serves as the full-stack framework communicating with Supabase (PostgreSQL 14.5).
* **Frontend Architecture**: React 19 Client Components (`"use client"`) handle interactivity; Server Components (`page.tsx`) perform initial secure data fetching. Server Actions (`actions.ts`) encapsulate form submissions securely. Include global generic loading and error boundaries.
* **Backend Architecture**: Next.js Server Actions execute securely on Vercel Edge/Serverless functions, relying on Supabase for the database layer. In-memory sliding window rate-limiting protects critical actions.
* **Supabase Architecture**: Relational PostgreSQL. Uses Supabase Auth, Row-Level Security (RLS) for data isolation, and Foreign Key constraints for relational integrity. Scheduled tasks handled by `pg_cron`.
* **Authentication Flow**: Uses Supabase SSR (`@supabase/ssr`). Credentials submitted via Next.js server actions invoke `signInWithPassword` or `signUp`. Session stored securely via HTTP-only cookies.
* **Authorization Model**: Custom Role-Based Access Control (RBAC). `public.users.role` defines whether a user is an `operator`, `customer`, or `admin`. Verified operators access `/operator`. Data isolation enforced by PostgreSQL RLS.

---

## Database Documentation

### `users`
* **Purpose**: Extended profile metadata for authenticated users.
* **Columns**: `id` (UUID, PK, matches `auth.users`), `name`, `email`, `phone_number`, `whatsapp_number`, `role` (enum: admin/operator/customer), `verification_status` (enum: unverified/verified/suspended), `operator_business_details` (JSONB).
* **RLS Policies**: Users can read/update their own profile. Privilege escalation trigger blocks changes to `role` and `verification_status` by authenticated users.
* **Security**: `prevent_role_escalation()` trigger fires BEFORE UPDATE. Only service_role/postgres can modify `role` or `verification_status`.

### `locations`
* **Purpose**: Defines pickup and destination points.
* **Columns**: `id` (UUID, PK), `name`, `description`.
* **RLS Policies**: Public read (active only). No client-side insert/update/delete.

### `vehicles`
* **Purpose**: Fleet inventory managed by operators.
* **Columns**: `id` (UUID, PK), `owner_id` (UUID, FK->users), `name`, `vehicle_type`, `capacity_seats`, `features`, `registration_number`, `image_url`, `is_active`, `maintenance_status`.
* **RLS Policies**: Public read if active. Operators can insert/update only their own vehicles (`owner_id = auth.uid()`).
* **Validation**: `image_url` must match `/images/[filename].(jpg|jpeg|png|webp)` pattern.

### `routes`
* **Purpose**: Standard paths linking two locations. Supports multi-tenant ownership.
* **Columns**: `id` (UUID, PK), `origin_id` (UUID, FK->locations), `destination_id` (UUID, FK->locations), `distance_km`, `estimated_duration_mins`, `owner_id` (UUID, FK->users, nullable), `is_active`.
* **Constraints**: Unique (`origin_id`, `destination_id`), preventing identical routes. `origin_id` != `destination_id`.
* **RLS Policies**: Public read (active routes). INSERT/UPDATE/DELETE by verified operators only for owned routes (`owner_id = auth.uid()`).

### `schedules`
* **Purpose**: Links a vehicle to a route for a specific departure time.
* **Columns**: `id` (UUID, PK), `route_id`, `vehicle_id`, `departure_time`, `arrival_time`, `base_fare`, `total_seats`, `available_seats`, `status`.
* **Constraints**: `available_seats >= 0`, `available_seats <= total_seats`.
* **RLS Policies**: Public read. Operator write (for owned vehicles — validated in server actions).

### `bookings`
* **Purpose**: Tracks customer ticket or bus reservations.
* **Columns**: `id` (UUID, PK), `customer_id` (UUID, FK), `schedule_id` (UUID, FK, nullable), `booking_type` (ticket/whole_vehicle), `travel_date` (Date), `start_date` (Date), `end_date` (Date), `seats_requested` (Integer), `status` (pending/approved/rejected/cancelled), `booking_reference` (String), `operator_notes`.
* **RLS Policies**: Customers can view/create their own. Operators can view/update bookings tied to their vehicles.
* **Trigger**: `trg_booking_status_change` fires on INSERT/UPDATE of `status` → auto-inserts into `booking_events`.

### `booking_vehicles`
* **Purpose**: Maps whole-vehicle bookings to one or more vehicles.
* **Columns**: `id` (UUID, PK), `booking_id` (UUID, FK), `vehicle_id` (UUID, FK).
* **RLS Policies**: Customers can INSERT mappings for their own bookings. Operators can read mappings tied to their vehicles.

### `booking_events`
* **Purpose**: Immutable audit log tracking every booking status transition.
* **Columns**: `id` (UUID, PK), `booking_id` (UUID, FK→bookings), `actor_id` (UUID, FK→users), `from_status` (nullable), `to_status`, `reason` (nullable), `created_at`.
* **RLS Policies**: Customers view events on their bookings. Operators view events on bookings tied to their vehicles. INSERT restricted to `actor_id = auth.uid()`.
* **Auto-populated by**: `log_booking_status_change()` trigger on `bookings.status` changes.

### PostgreSQL Functions

| Function | Type | Purpose |
|----------|------|----------|
| `book_seats(schedule_id, seats)` | SECURITY INVOKER | Atomically decrements `available_seats`. Returns `false` if insufficient. |
| `restore_seats(schedule_id, seats)` | SECURITY INVOKER | Restores seats, capped at `total_seats`. Used on cancel/reject. |
| `expire_stale_bookings()` | SECURITY DEFINER | Cancels pending bookings >24h old, restores their seats. Scheduled via `pg_cron`. |
| `log_booking_status_change()` | SECURITY DEFINER | Trigger function: auto-inserts `booking_events` on status change. |
| `cancel_booking_atomic(booking_id, cust_id)` | SECURITY INVOKER | Atomically updates status to cancelled and restores seats for the customer. |
| `update_booking_status_atomic(...)` | SECURITY INVOKER | Atomically updates status (approve/reject/cancel) and restores seats for the operator. |

---

## Security Model
* **Threat Assumptions**: Clients are untrusted. Data can be spoofed in transit. Users may attempt privilege escalation, cross-tenant data access, or mass-assignment attacks.
* **Trust Boundaries**: Next.js Server Actions and Supabase RLS form the definitive trust boundary. Client components are presentation-only.
* **Authentication Design**: Secure HTTP-only cookies managed via `@supabase/ssr`. Identity always derived from `supabase.auth.getUser()`.
* **Authorization Design**: `role`-based row access. Operator access to dashboard is strictly server-verified.
* **Privilege Escalation Protections**:
  * PostgreSQL trigger blocks `role` and `verification_status` changes by authenticated users.
  * All Server Actions explicitly whitelist mutable fields.
* **Data Validation Strategy**:
  * Phone numbers: strict `+91[0-9]{10}` regex enforced server-side.
  * Image URLs: validated against `/images/` prefix pattern.
  * Rate-limiting: Server actions for booking creation are protected by in-memory rate limiting (3 requests / 60 seconds).
* **Ownership Model**: `owner_id` on `vehicles` and `routes` tables. All mutations verify `auth.uid() == owner_id`.
* **Security Headers**: Globals configured in `next.config.ts` (X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy).

---

## Frontend Inventory

| Route | Purpose | Components | API / Server Actions | Permissions |
|-------|---------|------------|----------------------|-------------|
| `/` | Discovery & Booking | `HomeClient.tsx`, `page.tsx` | Supabase Select, `createTicketBooking`, `createWholeVehicleBooking` | Public |
| `/login` | Auth (Login + Signup toggle) | `login/page.tsx` | `login`, `signup` | Public |
| `/operator` | Operator Dashboard | `operator/page.tsx` | Supabase Join Queries, `updateBookingStatus` | `operator` role |
| `/operator/fleet` | Fleet Management | `FleetClient.tsx`, `fleet/page.tsx` | `upsertVehicle`, `upsertRoute`, `upsertSchedule` | `operator` role |
| `/bookings` | Customer Dashboard | `bookings/page.tsx`, `CustomerCancelButton.tsx` | Supabase Join Queries, `cancelBooking` | Authenticated |
| `/profile` | User Profile | `ProfileForm.tsx`, `profile/page.tsx` | `updateProfile`, `updatePassword` | Authenticated |

### Middleware Protection
Protected routes: `/operator`, `/dashboard`, `/profile`, `/bookings` — all redirect to `/login` if unauthenticated.

---

## Business Logic Documentation
* **Ticket Booking Workflow**: Customer selects Origin, Destination, Date, Seats -> Action Rate-Limited -> System validates `schedules.available_seats` transactionally -> Booking record created -> `available_seats` decremented -> User presented with WhatsApp redirect.
* **Whole-Vehicle Booking Workflow**: Customer selects Dates, Vehicles -> Action Rate-Limited -> System verifies vehicles exist -> Booking record created -> Junction table (`booking_vehicles`) updated -> User presented with WhatsApp redirect.
* **WhatsApp Integration**: Generated client-side using `https://wa.me/{operator_phone}?text={message}`.
* **Operator Workflow**: Operator logs into `/operator` -> Server queries own vehicles, schedules, and directly linked bookings -> Can approve/reject/cancel bookings (using atomic RPCs).
* **Fleet Management Workflow**: Operator navigates to `/operator/fleet` -> Tabbed interface (Vehicles / Routes / Schedules) -> Inline forms for adding entities -> All mutations validated server-side.

---

## Technical Debt Register

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| TD-03 | **Image Hosting**: Static `/images/` URLs. Should migrate to Supabase Storage. | Medium | Open |
| TD-04 | **Vehicle Inline Editing**: Fleet forms don't pre-populate for editing. | Low | Open |
| TD-05 | **Leaked Password Protection**: HaveIBeenPwned disabled. Enable in Dashboard. | Medium | Open |
| TD-06 | ~~**Booking Expiry Scheduling**~~ | ~~Medium~~ | ✅ Resolved — scheduled via `pg_cron` |
| TD-07 | ~~**Whole-Vehicle Booking Mock UI**~~ | ~~High~~ | ✅ Resolved — Fully operational flow |
| TD-08 | ~~**Duplicate Navbar Component**~~ | ~~Low~~ | ✅ Resolved — Merged to Single Source of Truth |
| TD-09 | ~~**Rate Limiting**~~ | ~~High~~ | ✅ Resolved — Server action sliding window |
| TD-10 | ~~**Error & Loading Boundaries**~~ | ~~Medium~~ | ✅ Resolved — Suspense boundaries added |

---

## Missing Features & Roadmap

### Post-MVP — Online Payments
> **Decision**: Online payments are explicitly deferred until ALL Phase 6C and Production Hardening items are validated in production. No customer funds should be collected until booking concurrency and operator approval workflows are fully proven.

**Prerequisites (must be completed before starting):**
1. Atomic seat allocation is deployed and load-tested
2. Audit logging is active and captures all booking state transitions
3. Operator cancellation workflow handles seat restoration correctly
4. Booking expiry prevents stale seat locks

**Scope (when unblocked):**
* Razorpay integration with payment verification
* Webhook validation with idempotency keys
* Payment audit logging (separate from booking audit log)
* Refund workflow tied to operator cancellations

### Deferred Features
* **Seat Selection Map**: Introduces significant complexity (concurrency, seat locking, UI). Deferred until post-payment milestone.
* **Multi-language Support**: Hindi/Bengali localization deferred until user base warrants it.

---

## Decision Log
* **2026-06-03**: Used `wa.me` Deep-links instead of WhatsApp Business API to eliminate Meta approval overhead and API costs for the MVP.
* **2026-06-03**: Revoked EXECUTE on SECURITY DEFINER trigger functions from anon/authenticated roles to prevent abuse via REST RPC endpoints. Pinned `search_path`.
* **2026-06-03**: Upgraded Whole-Vehicle bookings from a future roadmap item to a required MVP flow to eliminate non-functional UI endpoints.
* **2026-06-03**: Transitioned individual Supabase queries for booking state changes (approve/reject/cancel) to atomic `SECURITY INVOKER` RPCs to resolve dangerous mid-flight race conditions.
* **2026-06-03**: Addressed Turbopack Next.js build errors by removing `next/font` fetches for Google Fonts to prevent isolated build environment failure modes.
* **2026-06-03**: Configured `pg_cron` natively via database migrations to manage booking expiry chron jobs, bypassing edge function complexities.

---

## Migration History

| Migration | Description |
|-----------|-------------|
| `000001_core_schema.sql` | Users, locations, vehicles tables |
| `000002_rls_policies_and_triggers.sql` | RLS + privilege escalation trigger |
| `000003_seed_frontend_data.sql` | Seed operator, vehicles, locations (strengthened) |
| `000004_auth_trigger.sql` | Auth trigger (superseded by 000010) |
| `000005_routes_schedules_schema.sql` | Routes and schedules tables |
| `000006_routes_schedules_rls.sql` | RLS for routes and schedules |
| `000007_seed_routes_schedules.sql` | Seed routes and schedules |
| `000008_bookings_schema.sql` | Bookings and booking_vehicles tables |
| `000009_bookings_rls.sql` | RLS for bookings |
| `000010_auth_trigger.sql` | Idempotent auth trigger with field whitelisting |
| `000011_add_route_owner.sql` | Adds `owner_id` to routes for multi-tenant ownership with RLS |
| `000012_security_hardening.sql` | Revokes EXECUTE on SECURITY DEFINER triggers from anon/authenticated, pins search_path |
| `000013_atomic_seat_booking.sql` | `book_seats()` + `restore_seats()` atomic PostgreSQL functions |
| `000014_booking_events.sql` | `booking_events` audit table + `log_booking_status_change()` trigger |
| `000015_booking_expiry.sql` | `expire_stale_bookings()` function for scheduled cleanup |
| `000016_booking_vehicles_rls.sql` | Insert policy for customers on junction table |
| `000017_atomic_booking_update.sql` | Operator state transitions moved to atomic RPC functions |
| `000018_enable_pg_cron.sql` | Automated hourly cron schedule for stale booking cleanup |

---

## Implementation Progress
* **Completed Tasks**: Production Hardening Sprint complete. Rate limiting, Whole-Vehicle Booking flow, UI code sanitization, generic boundaries, pg_cron integration, and atomic RPC transaction wrappers are fully integrated and verified via strict build pipeline tests.
* **Current Tasks**: Production Deployment.
* **Blockers**: None.
* **Next Actions**: Final deploy to production. Begin Phase 6D planning (email notifications, SEO).
