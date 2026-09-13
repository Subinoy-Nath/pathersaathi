# Pather Saathi — Comprehensive Codebase Audit & Architectural Reference

**Document Version**: 1.0.0  
**Target Repository**: `/home/biswajyoti-nath/Projects/pathersaathi`  
**Audit Date**: September 13, 2026  
**Status**: Authoritative Reference  
**Auditor**: Teamwork Architecture & Survey Division (Worker Doc Audit)  
**Primary References**: Graphify Knowledge Graph (`graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`), Master Context Specification (`docs/MASTER_CONTEXT.md`), System Artifact (`docs/PROJECT_ARTIFACT.md`), Adversarial Security Audit (`SECURITY_AUDIT_REPORT.md`), B.Tech Academic Thesis (`docs/main.pdf`).

---

## 1. Executive Summary & System Overview

**Pather Saathi** is an end-to-end, regional transit booking and fleet management platform engineered specifically for the Barak Valley region of Assam, India (connecting urban and peri-urban centers including Silchar, Hailakandi, and Karimganj). The system addresses chronic operational fragmentation in regional transport—characterized by uncoordinated private bus schedules, lack of seat transparency, manual ticketing, and zero digital oversight for fleet operators.

### 1.1 Dual Booking Core
The application provides two complementary transaction flows:
1. **Scheduled Seat Booking (Ticket Mode)**: Commuters search scheduled departures between regional transit hubs (e.g., Silchar ISBT to Hailakandi Bus Stand), view real-time seat availability, and reserve individual seats via atomic database operations.
2. **Whole-Vehicle Charter (Charter Mode)**: Customers reserve one to five entire buses for community events, weddings, pilgrimages, educational excursions, and commercial tours.

### 1.2 Architectural Philosophy
The codebase prioritizes **strict database-level guarantees** over fragile application-layer checks:
- **Zero Race Conditions**: Seat allocation relies on PostgreSQL atomic stored procedures (`book_seats`, `restore_seats`) utilizing conditional updates (`WHERE available_seats >= requested`) rather than client-driven read-then-write transactions.
- **Multi-Tenant Data Isolation**: Row-Level Security (RLS) is enforced across every public table. Operators cannot inspect, alter, or intercept data belonging to competing fleets.
- **Serverless & Edge Alignment**: The frontend is built on Next.js 16 App Router with Server Components and Server Actions, backed by Supabase SSR session token rotation and Upstash Redis sliding-window rate limiting.

---

## 2. Technology Stack & Environment Configuration

| Architectural Tier | Technology / Library | Version | Role in System | Architectural Rationale & Trade-offs |
|---|---|---|---|---|
| **Frontend Framework** | Next.js (App Router) | 16.2.6 | Full-stack SSR, React Server Components, and Server Actions | Eliminates client-side data waterfalls; Server Actions provide zero-bundle RPCs for mutations. |
| **Runtime & Rendering** | React | 19.2.4 | UI Component Engine | React 19 server/client boundary separation; concurrent transitions via `startTransition`. |
| **Styling Engine** | Tailwind CSS | v4.0 | Design System & Glassmorphism | Pure CSS PostCSS integration (`@tailwindcss/postcss`); zero-runtime footprint; custom theme variables. |
| **Database & Auth** | Supabase (PostgreSQL) | 14.5 | Relational storage, GoTrue Auth, Realtime WAL engine | Managed PostgreSQL with RLS, atomic PL/pgSQL stored procedures, and WebSocket subscriptions. |
| **Auth Client / SSR** | `@supabase/ssr` / `supabase-js` | 0.10.3 / 2.107.0 | Cryptographic session handling | Cookie-based session management avoiding deprecated `getSession()` in favor of `getUser()`. |
| **Distributed Rate Limiting** | `@upstash/ratelimit` / `@upstash/redis` | 2.0.8 / 1.38.0 | API Protection & DoS Prevention | Serverless Redis sliding window (3 requests / 60s); stateless across Vercel edge instances. |
| **UI Enhancements** | `@formkit/auto-animate` | 0.9.0 | Micro-interactions | Zero-config layout transitions for dynamic bus search and schedule tables. |
| **Notification Engine** | `sonner` | 2.0.7 | Toast Notifications | High-performance toast alerts triggered by Supabase Realtime broadcast events. |
| **Telemetry & Analytics**| `@vercel/analytics` | 2.0.1 | Client Metrics | Web vitals and route transition performance monitoring. |

### Environment Variables & Secrets Configuration
- `NEXT_PUBLIC_SUPABASE_URL`: Public endpoint for the Supabase project (`https://<project-id>.supabase.co`). Required by browser and server clients.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key with RLS enforcement. Required for public reads and user authentication.
- `UPSTASH_REDIS_REST_URL`: Secret HTTPS endpoint for Upstash serverless Redis.
- `UPSTASH_REDIS_REST_TOKEN`: Secret Bearer authentication token for Upstash Redis.
- *Fault Tolerance Policy*: When Upstash credentials are absent in local development environments, `src/lib/ratelimit.ts` gracefully degrades (fails safe/open) without halting compilation or execution.

---

## 3. Physical Directory Tree & Layout Audit

Below is the verified physical layout of the repository as resident on disk at `/home/biswajyoti-nath/Projects/pathersaathi`:

```
/home/biswajyoti-nath/Projects/pathersaathi/
├── .agents/                               # Multi-agent collaboration workspaces & metadata
├── .git/                                  # Git version control tree
├── .gitignore                             # Repository exclusion patterns
├── .mcp.json                              # Local Model Context Protocol (MCP) definitions
├── ORIGINAL_REQUEST.md                    # Core project specifications & user prompt
├── README.md                              # Operational runbook, architecture overview, quickstart
├── SECURITY_AUDIT_REPORT.md               # 1,481-line adversarial penetration report (Score: 72/100)
├── replace_script.py                      # TeX compile helper script
├── report.log                             # Diagnostic output log
├── package.json                           # Root package file (@vercel/analytics dependency)
├── package-lock.json                      # Root dependency lockfile
├── skills-lock.json                       # Agent skills installation lockfile
├── graphify-out/                          # Generated Graphify Knowledge Graph artifacts
│   ├── graph.json                         # 484 nodes, 546 edges topological graph
│   ├── graph.html                         # Interactive D3/Vis-network graph visualizer (383 KB)
│   ├── GRAPH_REPORT.md                    # Structural cluster, god node, and community analysis
│   ├── manifest.json                      # Extraction manifest and file hash registry
│   └── cost.json                          # LLM token expenditure register (0 cost via AST)
├── docs/                                  # Project documentation & academic thesis source
│   ├── CODEBASE_AUDIT.md                  # This authoritative codebase audit document
│   ├── DRIVER_LIVE_TRACKING_PLAN.md       # Low-literacy driver UX & telemetry implementation plan
│   ├── KNOWN_ISSUES.md                    # Bug tracker and architectural caveats
│   ├── MASTER_CONTEXT.md                  # 373-line single-source-of-truth technical reference
│   ├── PROJECT_ARTIFACT.md                # System components & schema artifact
│   ├── PROJECT_REPORT.md                  # Comprehensive academic technical write-up
│   ├── TECHNICAL_DEBT_REGISTER.md         # Resolved and active technical debt register
│   ├── main.tex                           # 52-page B.Tech thesis LaTeX source code
│   ├── main.pdf                           # Compiled academic thesis PDF
│   ├── frontmatter.tex                    # LaTeX frontmatter and declaration
│   ├── references.bib                     # Academic bibliography
│   ├── homepage.png                       # High-resolution screenshot of landing UI
│   ├── operator-dashboard.png             # High-resolution screenshot of operator portal
│   ├── supabase-schema-*.png              # Production database ER diagram snapshot
│   └── logo.png                           # Primary brand emblem
├── supabase/                              # Supabase backend, CLI config, and migration engine
│   ├── config.toml                        # Local Supabase development configuration
│   ├── seed.sql                           # Seed script
│   ├── seed.sql.bak                       # Backup seed archive (133 KB)
│   ├── scripts/
│   │   └── cloud_fresh_start_reset.sql    # Clean reset script with driver telemetry tables
│   ├── snippets/                          # SQL query snippets
│   └── migrations/                        # 29 sequential schema migration files (see Section 5)
└── frontend/                              # Next.js 16 App Router application
    ├── package.json                       # Frontend dependencies and run scripts
    ├── next.config.ts                     # Next.js config with Strict-Transport-Security & headers
    ├── tsconfig.json                      # Strict TypeScript compiler config with @/* alias
    ├── postcss.config.mjs                 # PostCSS plugin registration for Tailwind v4
    ├── eslint.config.mjs                  # Flat ESLint 9 configuration extending next/core-web-vitals
    ├── AGENTS.md                          # Engineering directives for AI subagents
    ├── CLAUDE.md                          # Workflow instructions for Claude Code
    ├── public/                            # Static public web assets
    │   ├── images/                        # Bus fleet photo assets (bus1.jpg through bus10.jpg)
    │   │   ├── bus1.jpg ... bus10.jpg     # Bus imagery for Barak Valley fleet
    │   │   ├── logo.jpeg                  # Rasterized brand mark
    │   │   └── navlogo.png                # Transparent navbar header logo
    │   ├── favicon.ico                    # Browser favicon
    │   ├── llms.txt                       # Machine-readable site summary for LLMs
    │   ├── googlee82d9639fc8eae1f.html    # Search console verification token
    │   └── file.svg, globe.svg, etc.      # Vector iconography
    └── src/
        ├── proxy.ts                       # Edge interceptor (delegates to updateSession)
        ├── lib/
        │   └── ratelimit.ts               # Upstash Redis sliding window limiter instance
        ├── types/
        │   └── database.types.ts          # Auto-generated TypeScript definitions for Supabase schema
        ├── utils/
        │   └── supabase/
        │       ├── client.ts              # Browser client factory (createBrowserClient)
        │       ├── server.ts              # Server client factory (createServerClient + cookies)
        │       └── middleware.ts          # Session refresher & route protector (updateSession)
        ├── components/
        │   ├── Navbar.tsx                 # Client navbar with mobile drawer and role-aware navigation
        │   ├── NavbarServer.tsx           # Server Component resolving user session for Navbar
        │   ├── BookingActionButtons.tsx   # Operator modal for approving, rejecting, cancelling bookings
        │   ├── CustomerCancelButton.tsx   # Customer self-service cancellation button with confirmation
        │   ├── ClearHistoryButton.tsx     # Operator client-side cookie filter button
        │   ├── LiveBookingsRefresher.tsx  # Headless Supabase Realtime listener on `bookings`
        │   └── AnimatedTableBody.tsx      # Table body wrapper utilizing FormKit auto-animate
        └── app/
            ├── layout.tsx                 # Root layout shell (fonts, NavbarServer, Sonner Toaster)
            ├── page.tsx                   # Root landing page (Server Component fetching routes/fleet)
            ├── HomeClient.tsx             # Interactive 627-line landing page UI (search, booking forms)
            ├── actions.ts                 # Server actions: searchSchedules, createTicketBooking, etc.
            ├── error.tsx                  # Global error boundary component
            ├── loading.tsx                # Global loading skeleton
            ├── globals.css                # Tailwind v4 theme definitions and glassmorphic styles
            ├── robots.ts                  # Dynamic robots.txt generation
            ├── sitemap.ts                 # Dynamic sitemap.xml generation
            ├── auth/
            │   └── actions.ts             # Session termination (logout)
            ├── login/
            │   ├── page.tsx               # Auth page wrapper (redirects authenticated users to /)
            │   ├── LoginForm.tsx          # Client tabbed form (Sign In vs Create Account)
            │   └── actions.ts             # Server actions: login, signup (GoTrue integration)
            ├── bookings/
            │   ├── page.tsx               # Customer bookings portal (Server Component)
            │   ├── actions.ts             # Server action: cancelBooking (RPC cancel_booking_atomic)
            │   ├── loading.tsx            # Skeleton loader for bookings
            │   └── error.tsx              # Error boundary for bookings
            ├── profile/
            │   ├── page.tsx               # User profile management portal (Server Component)
            │   ├── ProfileForm.tsx        # Client profile form with strict +91 phone validation
            │   └── actions.ts             # Server actions: updateProfile, updatePassword
            └── operator/
                ├── page.tsx               # Operator Command Dashboard (metrics, live booking queue)
                ├── actions.ts             # Server actions: updateBookingStatus, clearFrontendHistory
                ├── loading.tsx            # Skeleton loader for operator dashboard
                ├── error.tsx              # Error boundary for operator dashboard
                └── fleet/
                    ├── page.tsx           # Fleet management portal (Server Component)
                    ├── FleetClient.tsx    # Tabbed fleet manager (CSS display:none form preservation)
                    └── actions.ts         # Server actions: upsertVehicle, upsertRoute, upsertSchedule
```

---

## 4. Graphify Knowledge Graph Analysis

The codebase was analyzed using the **Graphify** knowledge graph engine, mapping file relationships, architectural dependencies, degree centrality, and latent structural couplings.

```
+-------------------------------------------------------------------------+
|                  GRAPHIFY KNOWLEDGE GRAPH SUMMARY                       |
+-------------------------------------------------------------------------+
|  Total Corpus Detected  : 109 - 113 files (~200,468 to ~202,596 words)   |
|  Total Graph Nodes      : 484 nodes across 6 categories                 |
|  Total Graph Edges      : 546 edges                                     |
|  Edge Quality Breakdown : 91% EXTRACTED (499 edges, 1.00 confidence)    |
|                           9% INFERRED (47 edges, 0.91 avg confidence)   |
|                           0% AMBIGUOUS (2 review-flagged edges)         |
|  Topological Clusters   : 95 communities (24 cohesive, 48 thin omitted) |
|  Graph Artifacts        : graphify-out/graph.json (409 KB)              |
|                           graphify-out/graph.html (383 KB D3 visualizer)|
|                           graphify-out/GRAPH_REPORT.md (15.6 KB report) |
+-------------------------------------------------------------------------+
```

### 4.1 God Nodes (Core Architectural Hubs)
God nodes are entities with exceptionally high degree and betweenness centrality. They anchor the entire distributed architecture:

1. **`createClient()` (33 edges)**: The universal client factory spanning `src/utils/supabase/client.ts` and `src/utils/supabase/server.ts`. Every Server Component, Server Action, and Realtime listener connects through this node.
2. **`B.Tech Thesis: Pather Saathi Fleet Platform` (17 edges)**: `docs/main.pdf`, acting as the normative specification linking theoretical problem statements to implemented database schemas.
3. **`compilerOptions` (16 edges)**: `frontend/tsconfig.json`, anchoring module resolution, path aliases (`@/*`), and TypeScript strictness.
4. **`Vehicles Entity (public.vehicles)` (14 edges)**: The core operational entity bridging fleet operators, routes, schedules, whole-bus charters, and GPS telemetry.
5. **`Thesis Chapter 7: System Design & Architecture` (12 edges)**: The architectural blueprint linking ER diagrams, sequence flows, and deployment topology.
6. **`Database Table: bookings` (10 edges)**: The central transactional entity coordinating customer reservations, vehicle assignments, and audit trails.
7. **`Figure 7.4 Entity Relationship Diagram` (9 edges)**: Relational blueprint in `docs/main.pdf` verifying foreign key integrity across the schema.
8. **`Supabase PostgreSQL Schema ER Diagram` (9 edges)**: Schema snapshot from production project `icgfsgeozajvveyfkcqj`.
9. **`Master Database Schema Specification` (8 edges)**: `docs/MASTER_CONTEXT.md`, the single source of truth for tables, RPCs, and RLS rules.
10. **`include` (7 edges)**: Path inclusion boundary in `frontend/tsconfig.json`.

### 4.2 Key Topological Communities
The graph partitions into 95 distinct topological communities. The primary functional clusters include:
- **Community 0 — Customer Booking & Cancellation (23 nodes, cohesion 0.11)**: Groups `cancelBooking()` (`src/app/bookings/actions.ts`), `BookingsPage()`, auth actions, and schedule management.
- **Community 2 — Booking Creation & Server Actions (24 nodes, cohesion 0.10)**: Encapsulates `createTicketBooking()`, `createWholeVehicleBooking()`, `searchSchedules()`, `checkRateLimit()`, and `forceDataRefresh()` in `src/app/actions.ts`.
- **Community 6 — Operator Command Dashboard (23 nodes, cohesion 0.13)**: The fleet owner interface: `BookingActionButtons`, `AnimatedTableBody`, `ClearHistoryButton`, and `LiveBookingsRefresher`.
- **Community 10 — Global App Layout & Auth Session (8 nodes, cohesion 0.21)**: Root shell, Geist/Inter fonts, `Navbar()`, `NavbarServer()`, and `logout()`.
- **Community 11 — Operator Dashboard State Management (8 nodes, cohesion 0.26)**: Server Component `OperatorDashboard()`, `clearFrontendHistory()` cookie manipulation, and `updateBookingStatus()`.
- **Communities 12, 14, 15, 17, 18, 19 — Database Schemas & Stored Procedures**: Relational clusters defining tables (`users`, `vehicles`, `locations`, `routes`, `schedules`, `bookings`, `booking_vehicles`, `booking_events`, `trip_locations`) and RPCs (`book_seats`, `restore_seats`, `update_booking_status_atomic`, `cancel_booking_atomic`).
- **Community 20 — Edge Middleware & Auth Session Refresh (3 nodes, cohesion 0.60)**: `proxy()` (`src/proxy.ts`), `updateSession()` (`src/utils/supabase/middleware.ts`), and route matchers.

### 4.3 Inferred & Cross-Cutting Connections
Graphify revealed non-obvious semantic bridges connecting documentation to code implementation:
- **`Thesis Chapter 10: Challenges Encountered` $\leftrightarrow$ `Resolved Debt: Upstash Rate Limiter Fail-Open`**: Documents the transition from in-memory Maps (which failed across Vercel serverless cold starts) to serverless Redis.
- **`Thesis Chapter 10: Challenges Encountered` $\leftrightarrow$ `Resolved Debt: Whole Vehicle Booking RLS Block`**: Documents why `book_whole_vehicle_atomic` was introduced to bypass restrictive junction table RLS.
- **`Pather Saathi Security Architecture` (`README.md`) $\leftrightarrow$ `Defense-in-Depth Security Strategy` (`SECURITY_AUDIT_REPORT.md`)**: Confirms three-layer security (Edge headers $\to$ GoTrue Auth $\to$ PostgreSQL RLS).

### 4.4 System Hyperedges (Multi-Entity Workflows)
Graphify extracted four structural hyperedges representing end-to-end distributed system operations:
1. **End-to-End Booking Lifecycle Workflow**: Links booking state machine, atomic `book_seats()` RPC, `book_whole_vehicle_atomic()` RPC, `cancel_booking_atomic()` RPC, customer booking action, and operator approval flow.
2. **Relational Core Fleet Schema Model**: Encompasses `users`, `locations`, `vehicles`, `routes`, `schedules`, `bookings`, `booking_vehicles`, `booking_events`, and visual ER diagrams.
3. **Defense-in-Depth Multi-Layer Security Architecture**: Encompasses HTTP headers, RBAC matrices, `SECURITY DEFINER` RPCs with `SET search_path = public`, and the `user_owns_booking()` anti-recursion guard.
4. **AI-Augmented Orchestration Development Workflow**: Spans Supabase MCP, Stitch MCP, Antigravity configurations, and thesis Chapter 5 methodology.

---

## 5. Database Architecture, Schemas, & Migrations Catalog

The backend database runs on Supabase (PostgreSQL 14.5) with Row-Level Security enabled on every public table.

### 5.1 Chronological Migration History (29 Sequential Migrations)

| Migration Identifier | Target Scope | Key Operations & Architectural Intent |
|---|---|---|
| `20260603000001_core_schema.sql` | Core Tables | Creates `locations`, `vehicles`, `users` tables, updated_at trigger function. |
| `20260603000002_rls_policies_and_triggers.sql` | RLS Baseline | Enables RLS on core tables; adds user profile self-read/update policies. |
| `20260603000003_seed_frontend_data.sql` | Seed Data | Seeds 8 Barak Valley locations, Shibam Coach 01-10 vehicles, and initial operator. |
| `20260603000004_auth_trigger.sql` | GoTrue Hook | Creates `public.handle_new_user()` trigger mirroring `auth.users` to `public.users`. |
| `20260603000005_routes_schedules_schema.sql` | Routes & Schedules | Creates `routes` and `schedules` tables with timestamps and seat counters. |
| `20260603000006_routes_schedules_rls.sql` | RLS Policies | Public read on active routes/schedules; operator full CRUD on own records. |
| `20260603000007_seed_routes_schedules.sql` | Seed Data | Seeds Silchar-Hailakandi and Silchar-Karimganj corridors with scheduled runs. |
| `20260603000008_bookings_schema.sql` | Bookings Core | Creates `bookings` and `booking_vehicles` junction table with check constraints. |
| `20260603000009_bookings_rls.sql` | RLS Policies | Initial customer and operator access rules for bookings. |
| `20260603000010_auth_trigger.sql` | Auth Hardening | Updates `handle_new_user()` to parse metadata (`name`, `phone_number`). |
| `20260603000011_add_route_owner.sql` | Route Partitioning | Adds `owner_id UUID REFERENCES users(id)` to `routes` for multi-operator isolation. |
| `20260603000012_security_hardening.sql` | Privilege Hardening | Revokes unauthorized public execute permissions on internal trigger procedures. |
| `20260603000013_atomic_seat_booking.sql` | Atomic RPCs | Implements `book_seats()` and `restore_seats()` with atomic decrement/increment. |
| `20260603000014_booking_events.sql` | Audit Trail | Creates `booking_events` table and `log_booking_status_change()` trigger. |
| `20260603000015_booking_expiry.sql` | Cleanup Logic | Implements `expire_stale_bookings()` RPC to purge pending bookings older than 24h. |
| `202606030000161_whole_vehicle_booking_rls.sql` | Charter RLS | Adjusts customer insert policies on `booking_vehicles`. |
| `20260603000016_atomic_booking_status.sql` | State Machine | Adds `update_booking_status_atomic()` and `cancel_booking_atomic()` RPCs. |
| `20260603000017_atomic_booking_update.sql` | Rejection Reasons | Hardens `update_booking_status_atomic()` to require minimum cancellation reasons. |
| `20260603000018_enable_pg_cron.sql` | Cron Automation | Enables `pg_cron` extension; schedules hourly sweep: `0 * * * *` `expire_stale_bookings()`. |
| `20260603000019_fix_rls_recursion.sql` | Anti-Recursion | Introduces `user_owns_booking()` (`SECURITY DEFINER`) to break cyclic RLS recursion. |
| `20260603000020_security_fixes.sql` | Definer Hardening | Converts booking RPCs to `SECURITY DEFINER`; introduces `book_whole_vehicle_atomic`. |
| `20260603000021_whole_vehicle_occasion.sql` | Charter Metadata | Adds `occasion` column to `bookings`; updates `book_whole_vehicle_atomic` signature. |
| `20260603000022_search_path_security.sql` | Search Path Guard | Applies `SET search_path = public` across all database functions against hijacking. |
| `20260603000023_admin_email_trigger.sql` | Role Assignment | Implements automated operator role mapping for administrative email domains. |
| `20260603000024_seed_admin_user.sql` | Seed Admin | Seeds system administrator credentials and permissions. |
| `20260610000001_schedules_unique_constraint.sql`| Schedule Integrity | Adds unique constraint `(vehicle_id, route_id, departure_time) WHERE deleted_at IS NULL`. |
| `20260610000002_bulk_upsert_schedules.sql` | Batch Generation | Creates `upsert_schedules(p_schedules jsonb)` RPC for bulk recurring scheduling. |
| `20260610000003_operator_view_customers_rls.sql`| Passenger RLS | Grants operators SELECT access on passenger profiles for confirmed bookings. |
| `20260902000001_driver_and_live_tracking.sql` | Telemetry & Driver | Adds `'driver'` role, `schedules.driver_id`, `trip_locations` table, `driver_start_trip`, `driver_end_trip`. |

---

### 5.2 Comprehensive Table Schema Inventory

#### Table: `public.users`
Mirrors Supabase GoTrue authentication accounts, storing extended profile and RBAC attributes.
- `id` (`UUID`, PK, `REFERENCES auth.users(id) ON DELETE CASCADE`)
- `name` (`TEXT`, NOT NULL)
- `email` (`TEXT`, NOT NULL, UNIQUE)
- `phone_number` (`TEXT`, UNIQUE)
- `whatsapp_number` (`TEXT`)
- `role` (`TEXT`, NOT NULL DEFAULT `'customer'`, `CHECK (role IN ('customer', 'operator', 'driver'))`)
- `verification_status` (`TEXT`, DEFAULT `'unverified'`)
- `operator_business_details` (`JSONB`)
- `created_at`, `updated_at`, `deleted_at` (`TIMESTAMPTZ`)
- **RLS Policies**:
  - `Users can read own profile`: `FOR SELECT USING (id = auth.uid())`
  - `Users can update own profile`: `FOR UPDATE USING (id = auth.uid())`
  - `Operators can view customer profiles`: `FOR SELECT USING (get_current_user_role() = 'operator' AND id IN (SELECT customer_id FROM bookings ...))`

#### Table: `public.locations`
Directory of physical transit hubs, boarding stations, and dropoff points across Barak Valley.
- `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
- `name` (`TEXT`, NOT NULL)
- `description` (`TEXT`)
- `is_active` (`BOOLEAN`, DEFAULT `true`)
- `created_at`, `updated_at`, `deleted_at` (`TIMESTAMPTZ`)
- **RLS Policies**:
  - `Public can read active locations`: `FOR SELECT USING (is_active = true AND deleted_at IS NULL)`
  - `Operators manage locations`: `FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'))`

#### Table: `public.vehicles`
Fleet registry representing physical buses.
- `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
- `owner_id` (`UUID`, `REFERENCES public.users(id) ON DELETE CASCADE`, *nullable as of migration 20260902000001*)
- `name` (`TEXT`, NOT NULL)
- `registration_number` (`TEXT`)
- `capacity_seats` (`INTEGER`, NOT NULL)
- `vehicle_type` (`TEXT`, DEFAULT `'bus'`)
- `features` (`TEXT`)
- `image_url` (`TEXT`)
- `is_active` (`BOOLEAN`, DEFAULT `true`)
- `created_at`, `updated_at`, `deleted_at` (`TIMESTAMPTZ`)
- **RLS Policies**:
  - `Public can read active vehicles`: `FOR SELECT USING (is_active = true AND deleted_at IS NULL)`
  - `Operators manage own vehicles`: `FOR ALL USING (owner_id = auth.uid())`

#### Table: `public.routes`
Defines transit corridors between designated origin and destination stops.
- `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
- `owner_id` (`UUID`, `REFERENCES public.users(id)`)
- `origin_id` (`UUID`, NOT NULL, `REFERENCES public.locations(id)`)
- `destination_id` (`UUID`, NOT NULL, `REFERENCES public.locations(id)`)
- `distance_km` (`NUMERIC`)
- `estimated_duration_mins` (`INTEGER`)
- `is_active` (`BOOLEAN`, DEFAULT `true`)
- `created_at`, `updated_at`, `deleted_at` (`TIMESTAMPTZ`)
- **Constraints**: `origin_id != destination_id`
- **RLS Policies**:
  - `Public can view active routes`: `FOR SELECT USING (is_active = true AND deleted_at IS NULL)`
  - `Operators manage own routes`: `FOR ALL USING (owner_id = auth.uid())`

#### Table: `public.schedules`
Concrete scheduled runs for a vehicle on a specific route at a designated departure time.
- `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
- `vehicle_id` (`UUID`, NOT NULL, `REFERENCES public.vehicles(id)`)
- `route_id` (`UUID`, NOT NULL, `REFERENCES public.routes(id) ON DELETE CASCADE`)
- `driver_id` (`UUID`, `REFERENCES public.users(id) ON DELETE SET NULL`)
- `departure_time` (`TIMESTAMPTZ`, NOT NULL)
- `arrival_time` (`TIMESTAMPTZ`, NOT NULL)
- `total_seats` (`INTEGER`, NOT NULL)
- `available_seats` (`INTEGER`, NOT NULL, `CHECK (available_seats >= 0)`)
- `base_fare` (`NUMERIC`)
- `status` (`TEXT`, DEFAULT `'scheduled'`, `CHECK (status IN ('scheduled', 'in_transit', 'completed', 'cancelled'))`)
- `created_at`, `updated_at`, `deleted_at` (`TIMESTAMPTZ`)
- **Index**: Unique index on `(vehicle_id, route_id, departure_time) WHERE deleted_at IS NULL`
- **RLS Policies**:
  - `Public can view scheduled runs`: `FOR SELECT USING (status = 'scheduled' AND deleted_at IS NULL)`
  - `Operators manage own schedules`: `FOR ALL USING (EXISTS (SELECT 1 FROM vehicles v WHERE v.id = schedules.vehicle_id AND v.owner_id = auth.uid()))`

#### Table: `public.bookings`
Master record of transactions for ticket reservations and whole-vehicle charters.
- `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
- `booking_reference` (`TEXT`, UNIQUE, NOT NULL)
- `customer_id` (`UUID`, NOT NULL, `REFERENCES public.users(id) ON DELETE CASCADE`)
- `schedule_id` (`UUID`, `REFERENCES public.schedules(id)`)
- `booking_type` (`TEXT`, NOT NULL, `CHECK (booking_type IN ('ticket', 'whole_vehicle'))`)
- `travel_date` (`DATE`, NOT NULL)
- `start_date`, `end_date` (`TIMESTAMPTZ`)
- `occasion` (`TEXT`)
- `seats_requested` (`INTEGER`, DEFAULT 1)
- `total_price` (`NUMERIC`)
- `status` (`TEXT`, NOT NULL DEFAULT `'pending'`, `CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed', 'expired'))`)
- `operator_notes` (`TEXT`)
- `created_at`, `updated_at`, `deleted_at` (`TIMESTAMPTZ`)
- **RLS Policies**:
  - `Customers can insert own bookings`: `FOR INSERT WITH CHECK (customer_id = auth.uid() AND status = 'pending')`
  - `Customers can view own bookings`: `FOR SELECT USING (customer_id = auth.uid())`
  - `Operators can view bookings for their fleet`: `FOR SELECT USING (public.user_owns_booking(id, auth.uid()))`

#### Table: `public.booking_vehicles`
Junction table mapping one or more buses to a single whole-vehicle charter booking.
- `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
- `booking_id` (`UUID`, NOT NULL, `REFERENCES public.bookings(id) ON DELETE CASCADE`)
- `vehicle_id` (`UUID`, NOT NULL, `REFERENCES public.vehicles(id) ON DELETE CASCADE`)
- `created_at`, `updated_at` (`TIMESTAMPTZ`)
- **RLS Policies**:
  - `Customers view for their bookings`: `FOR SELECT USING (EXISTS (SELECT 1 FROM bookings WHERE id = booking_vehicles.booking_id AND customer_id = auth.uid()))`
  - `Operators view for their vehicles`: `FOR SELECT USING (EXISTS (SELECT 1 FROM vehicles WHERE id = booking_vehicles.vehicle_id AND owner_id = auth.uid()))`
  - Insertions are routed exclusively via the `book_whole_vehicle_atomic` RPC to prevent permission recursion.

#### Table: `public.booking_events`
Immutable audit log recording every booking state transition.
- `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
- `booking_id` (`UUID`, NOT NULL, `REFERENCES public.bookings(id) ON DELETE CASCADE`)
- `actor_id` (`UUID`, `REFERENCES public.users(id)`)
- `from_status` (`TEXT`)
- `to_status` (`TEXT`, NOT NULL)
- `reason` (`TEXT`)
- `created_at` (`TIMESTAMPTZ`, DEFAULT `now()`)
- **RLS Policies**:
  - Read-only for authenticated participants (customer who owns booking or operator who owns vehicle).
  - Insertions generated automatically via trigger `trg_booking_status_change` calling `log_booking_status_change()`.

#### Table: `public.trip_locations`
High-frequency GPS breadcrumb telemetry for active bus runs.
- `id` (`UUID`, PK, `DEFAULT gen_random_uuid()`)
- `schedule_id` (`UUID`, NOT NULL, `REFERENCES public.schedules(id) ON DELETE CASCADE`)
- `vehicle_id` (`UUID`, NOT NULL, `REFERENCES public.vehicles(id) ON DELETE CASCADE`)
- `driver_id` (`UUID`, NOT NULL, `REFERENCES public.users(id) ON DELETE CASCADE`)
- `latitude` (`DOUBLE PRECISION`, NOT NULL)
- `longitude` (`DOUBLE PRECISION`, NOT NULL)
- `speed` (`DOUBLE PRECISION`)
- `heading` (`DOUBLE PRECISION`)
- `accuracy` (`DOUBLE PRECISION`)
- `recorded_at` (`TIMESTAMPTZ`, NOT NULL DEFAULT `now()`)
- **Indexes**: `(schedule_id, recorded_at DESC)`, `(driver_id)`
- **Realtime**: Added to `supabase_realtime` publication.
- **RLS Policies**:
  - `Drivers can insert telemetry`: `FOR INSERT WITH CHECK (driver_id = auth.uid() AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'driver'))`
  - `Operators can view all telemetry`: `FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'operator'))`
  - `Passengers can view telemetry for booked trip`: `FOR SELECT USING (EXISTS (SELECT 1 FROM bookings b WHERE b.schedule_id = trip_locations.schedule_id AND b.customer_id = auth.uid() AND b.status = 'approved'))`

---

### 5.3 Stored Procedures & Atomic RPC Catalog

Every stored procedure is compiled with `SECURITY DEFINER` and explicitly enforces `SET search_path = public` to mitigate search-path injection vulnerabilities:

1. **`book_seats(p_schedule_id UUID, p_seats_requested INTEGER) -> BOOLEAN`**
   - **File**: `20260603000013_atomic_seat_booking.sql`, `20260603000020_security_fixes.sql`
   - **Behavior**: Executes an atomic `UPDATE public.schedules SET available_seats = available_seats - p_seats_requested WHERE id = p_schedule_id AND available_seats >= p_seats_requested AND status = 'scheduled' AND deleted_at IS NULL`.
   - **Return**: `true` if seats were successfully decremented; `false` if insufficient seats or concurrent conflict.

2. **`restore_seats(p_schedule_id UUID, p_seats_to_restore INTEGER) -> VOID`**
   - **File**: `20260603000013_atomic_seat_booking.sql`, `20260603000020_security_fixes.sql`
   - **Behavior**: Executes `UPDATE public.schedules SET available_seats = LEAST(available_seats + p_seats_to_restore, total_seats) WHERE id = p_schedule_id AND deleted_at IS NULL`. Caps at `total_seats` to prevent over-restoration.

3. **`update_booking_status_atomic(p_booking_id UUID, p_actor_id UUID, p_new_status TEXT, p_reason TEXT) -> VOID`**
   - **File**: `20260603000016_atomic_booking_status.sql`, `20260603000017_atomic_booking_update.sql`, `20260603000020_security_fixes.sql`
   - **Behavior**: Validates that `p_actor_id` owns the vehicle/schedule linked to the booking. If `p_new_status` is `'cancelled'` or `'rejected'`, it automatically invokes `restore_seats()` to replenish seat counters. Logs transition into `booking_events`.

4. **`cancel_booking_atomic(p_booking_id UUID, p_customer_id UUID) -> VOID`**
   - **File**: `20260603000016_atomic_booking_status.sql`, `20260603000020_security_fixes.sql`
   - **Behavior**: Verifies customer ownership. If booking is currently `'pending'` or `'approved'`, transitions status to `'cancelled'`, restores reserved seats on the schedule, and creates audit record.

5. **`book_whole_vehicle_atomic(p_vehicle_ids UUID[], p_travel_date DATE, p_occasion TEXT, p_customer_id UUID, p_booking_reference TEXT) -> UUID`**
   - **File**: `20260603000020_security_fixes.sql`, `20260603000021_whole_vehicle_occasion.sql`
   - **Behavior**: Executes an atomic transaction inserting into `public.bookings` (`booking_type: whole_vehicle`), then iterates through `p_vehicle_ids` inserting rows into `public.booking_vehicles`. Bypasses RLS restrictions that prevent customers from directly inserting into junction tables.

6. **`expire_stale_bookings() -> VOID`**
   - **File**: `20260603000015_booking_expiry.sql`, `20260603000018_enable_pg_cron.sql`
   - **Behavior**: Finds all bookings with `status = 'pending'` and `created_at < now() - INTERVAL '24 hours'`, transitions them to `'expired'`, and restores seat counts on their respective schedules. Run automatically by `pg_cron` at `0 * * * *`.

7. **`user_owns_booking(p_booking_id UUID, p_user_id UUID) -> BOOLEAN`**
   - **File**: `20260603000019_fix_rls_recursion.sql`
   - **Behavior**: Resolves operator ownership by checking whether `p_user_id` matches `vehicles.owner_id` on the schedule or charter vehicles attached to `p_booking_id`. Being `SECURITY DEFINER`, it halts infinite recursion loops during RLS evaluation.

8. **`upsert_schedules(p_schedules JSONB) -> VOID`**
   - **File**: `20260610000002_bulk_upsert_schedules.sql`
   - **Behavior**: Accepts an array of schedule objects, performing batch upserts onto `(vehicle_id, route_id, departure_time) WHERE deleted_at IS NULL`. Protects existing bookings by skipping updates if pending/approved bookings exist.

9. **`driver_start_trip(p_schedule_id UUID) -> JSONB`**
   - **File**: `20260902000001_driver_and_live_tracking.sql`
   - **Behavior**: Verifies that the invoking user (`auth.uid()`) is either the assigned `driver_id` on the schedule or an operator. Updates schedule status to `'in_transit'`.

10. **`driver_end_trip(p_schedule_id UUID) -> JSONB`**
    - **File**: `20260902000001_driver_and_live_tracking.sql`
    - **Behavior**: Verifies driver authorization. Updates schedule status to `'completed'`.

11. **`get_current_user_role() -> TEXT`**
    - **File**: `20260610000003_operator_view_customers_rls.sql`
    - **Behavior**: Helper function returning `role` from `public.users` for `auth.uid()`.

12. **`handle_new_user() -> TRIGGER`**
    - **File**: `20260603000004_auth_trigger.sql`, `20260603000010_auth_trigger.sql`, `20260902000001_driver_and_live_tracking.sql`
    - **Behavior**: Executes upon `AFTER INSERT ON auth.users`. Copies user ID, email, name, and phone into `public.users`. Automatically grants verified operator status to administrative email addresses (`support@pathersaathi.in`) and claims unassigned fleet buses.

---

## 6. Server Actions & API Layer Specification

Mutations and secure queries are handled exclusively via Next.js Server Actions marked `'use server'`:

```
+---------------------------------------------------------------------------------------------------------------+
|                                      SERVER ACTIONS SPECIFICATION MATRIX                                     |
+---------------------------------------------------------------------------------------------------------------+
| Module File Path                 | Action Function Name          | Caller Role   | Target DB Operations       |
+----------------------------------+-------------------------------+---------------+----------------------------+
| src/app/actions.ts               | searchSchedules               | Public / Any  | SELECT routes, schedules   |
| src/app/actions.ts               | createTicketBooking           | Authenticated | book_seats, INSERT booking |
| src/app/actions.ts               | createWholeVehicleBooking     | Authenticated | book_whole_vehicle_atomic  |
| src/app/actions.ts               | forceDataRefresh              | System / Hook | None (revalidatePath)      |
| src/app/auth/actions.ts          | logout                        | Authenticated | supabase.auth.signOut()    |
| src/app/bookings/actions.ts      | cancelBooking                 | Customer      | cancel_booking_atomic      |
| src/app/login/actions.ts         | login                         | Guest / Any   | auth.signInWithPassword    |
| src/app/login/actions.ts         | signup                        | Guest / Any   | auth.signUp                |
| src/app/operator/actions.ts      | updateBookingStatus           | Operator      | update_booking_status_atom |
| src/app/operator/actions.ts      | clearFrontendHistory          | Operator      | Cookie set operator_clear  |
| src/app/operator/fleet/actions.ts| upsertVehicle                 | Operator      | INSERT / UPDATE vehicles   |
| src/app/operator/fleet/actions.ts| upsertRoute                   | Operator      | INSERT / UPDATE routes     |
| src/app/operator/fleet/actions.ts| upsertSchedule                | Operator      | RPC upsert_schedules       |
| src/app/profile/actions.ts       | updateProfile                 | Authenticated | UPDATE users & auth metadata|
| src/app/profile/actions.ts       | updatePassword                | Authenticated | auth.updateUser({password})|
+---------------------------------------------------------------------------------------------------------------+
```

### Detailed Action Contracts

#### 1. `searchSchedules` (`src/app/actions.ts:25-82`)
- **Inputs**: `pickupId: string`, `destinationId: string`, `travelDate: string`, `seats: number`.
- **Pre-conditions**: Required fields non-empty; `seats >= 1`.
- **Execution Flow**:
  1. Resolves `routes` table where `origin_id = pickupId` and `destination_id = destinationId` and `is_active = true`.
  2. Queries `schedules` for the resolved route within a 24-hour timestamp window (`departure_time >= travelDate AND < travelDate + 1 day`).
  3. Filters for `status = 'scheduled'` and `available_seats >= seats`.
- **Returns**: `{ success: boolean, schedules?: Schedule[], error?: string }`.

#### 2. `createTicketBooking` (`src/app/actions.ts:84-182`)
- **Inputs**: `formData: FormData` containing `scheduleId`, `seats`, `travelDate`.
- **Security Validations**:
  1. Authenticates user via `supabase.auth.getUser()`. Rejects with `'AUTH_REQUIRED'` if session is absent.
  2. Executes rate limit check via `checkRateLimit(user.id)` (Upstash Redis 3 req/60s).
  3. Validates seat integer count ($1 \le seats \le 20$).
- **Database Execution**:
  1. Fetches schedule details and operator WhatsApp number.
  2. Invokes `supabase.rpc('book_seats', { p_schedule_id, p_seats_requested: seats })`. If false, returns conflict error.
  3. Inserts row into `public.bookings` (`booking_type: 'ticket'`, `status: 'pending'`).
  4. **Rollback Handler**: If `bookings` insert throws an error, executes `supabase.rpc('restore_seats', ...)` to replenish seats.
- **Cache Side Effects**: `revalidatePath('/')`.
- **Returns**: `{ success: true, booking_reference, operator_whatsapp, message }`.

#### 3. `createWholeVehicleBooking` (`src/app/actions.ts:186-284`)
- **Inputs**: `formData: FormData` containing `vehicleIds` (JSON array), `travelDate`, `occasion`.
- **Security Validations**:
  1. User authentication verification.
  2. Upstash Redis rate limiting.
  3. Validates vehicle ID array length ($1 \le count \le 5$) and UUID regex conformity.
  4. Validates date chronological validity (`travelDate >= today`).
- **Database Execution**:
  1. Verifies all requested vehicle IDs exist and are active.
  2. Invokes `supabase.rpc('book_whole_vehicle_atomic', { p_vehicle_ids, p_travel_date, p_occasion, p_customer_id, p_booking_reference })`.
- **Cache Side Effects**: `revalidatePath('/')`.
- **Returns**: `{ success: true, booking_reference, operator_whatsapp, vehicle_names, message }`.

#### 4. `cancelBooking` (`src/app/bookings/actions.ts:6-26`)
- **Inputs**: `bookingId: string`.
- **Execution**: Validates `auth.getUser()`, executes `supabase.rpc('cancel_booking_atomic', { p_booking_id: bookingId, p_customer_id: user.id })`.
- **Cache Side Effects**: `revalidatePath('/bookings')`.

#### 5. `updateBookingStatus` (`src/app/operator/actions.ts:6-40`)
- **Inputs**: `bookingId: string`, `status: 'approved' | 'rejected' | 'cancelled'`, `reason?: string`.
- **Validations**: If `status === 'cancelled'`, strictly enforces `reason.trim().length >= 3`.
- **Execution**: Invokes `supabase.rpc('update_booking_status_atomic', { p_booking_id, p_actor_id: user.id, p_new_status: status, p_reason })`.
- **Cache Side Effects**: `revalidatePath('/operator', 'page')`.

#### 6. `upsertVehicle`, `upsertRoute`, `upsertSchedule` (`src/app/operator/fleet/actions.ts`)
- **Security Check**: Enforces `profile.role === 'operator'`. For routes, additionally requires `profile.verification_status === 'verified'`.
- **Identity Enforcement**: `owner_id` is always derived server-side from `auth.uid()`, preventing spoofing.
- **Schedule Expansion**: `upsertSchedule` accepts `repeat_days` ($1 \le repeat \le 30$), generating an array of daily departures and calling `supabase.rpc('upsert_schedules', { p_schedules })`.

---

## 7. Frontend Component Hierarchy & Route Structure

### 7.1 Route Architecture Note: Single-Page Search vs Sub-Routes
In the current production codebase, schedule discovery and ticket booking are implemented as client state transitions directly inside the root page (`/`) managed by `HomeClient.tsx`. There are no separate `/search` or `/booking` sub-route directories in `frontend/src/app`.
- **`/`**: Landing page, search interface, schedule selector, and whole vehicle charter grid.
- **`/bookings`**: Authenticated customer booking history and status tracker.
- **`/login`**: Sign In and Account Registration tabbed form.
- **`/profile`**: Account profile editor (+91 phone normalization, password change).
- **`/operator`**: Fleet operator command center (live booking queue, approval actions).
- **`/operator/fleet`**: Fleet manager (Vehicles, Routes, and Recurring Schedules tabs).

```
                      +---------------------------------------+
                      |         Root Layout (layout.tsx)      |
                      |  - GeistSans & GeistMono & Inter      |
                      |  - NavbarServer -> Navbar.tsx         |
                      |  - Sonner Toaster                     |
                      +-------------------+-------------------+
                                          |
         +--------------------------------+--------------------------------+
         |                                |                                |
+--------v--------+              +--------v--------+              +--------v--------+
|   Route: /      |              | Route: /bookings|              | Route: /operator|
| page.tsx (SSR)  |              | page.tsx (SSR)  |              | page.tsx (SSR)  |
|        |        |              |        |        |              |        |        |
| HomeClient.tsx  |              | CustomerCancel  |              | LiveBookings    |
| - Search form   |              | Button.tsx      |              | Refresher.tsx   |
| - Schedule cards|              +-----------------+              | AnimatedTable   |
| - Bus charter   |                                               | Body.tsx        |
| - WhatsApp CTA  |                                               | BookingAction   |
+-----------------+                                               | Buttons.tsx     |
                                                                  +--------+--------+
                                                                           |
                                                                  +--------v--------+
                                                                  | /operator/fleet |
                                                                  | page.tsx (SSR)  |
                                                                  |        |        |
                                                                  | FleetClient.tsx |
                                                                  | (display:none)  |
                                                                  +-----------------+
```

### 7.2 Key Component Inventory

1. **`HomeClient.tsx` (627 lines, Client Component)**:
   - Primary user interaction hub for commuters.
   - Manages state for journey type (tickets vs whole charter), origin/destination dropdowns, date picker, seat quantity, and bus selection.
   - Leverages `@formkit/auto-animate` for dynamic schedule cards.
   - Displays WhatsApp direct-connect deep-links (`https://wa.me/{operator_whatsapp}?text=...`) once a booking reference is created.

2. **`FleetClient.tsx` (Client Component)**:
   - Three-tab management dashboard for operators: **Vehicles**, **Routes**, and **Schedules**.
   - **State Preservation Architecture**: Uses CSS `display: none` (hidden/block) rather than React conditional unmounting. If an operator switches between tabs, unsaved input states are retained.

3. **`LiveBookingsRefresher.tsx` (Client Component)**:
   - Headless background listener subscribing to Supabase Realtime channel `operator_live_bookings` on table `bookings`.
   - Listens for `INSERT` and `UPDATE` events across the table.
   - Displays `sonner` toasts and executes `await forceDataRefresh()` followed by `router.refresh()` to update Next.js Server Components.

4. **`BookingActionButtons.tsx` (Client Component)**:
   - Action controls for fleet owners: Approve, Reject, Cancel.
   - Opens a modal requiring a mandatory explanation ($\ge 3$ characters) before submitting cancellation on confirmed bookings.

5. **`Navbar.tsx` & `NavbarServer.tsx`**:
   - `NavbarServer.tsx` evaluates server session via `createClient()` and `getUser()`, retrieving role from `public.users`.
   - `Navbar.tsx` renders responsive navigation with backdrop blur. Renders "Operator Dashboard" and "Fleet" links only when `role === 'operator'`.

6. **`CustomerCancelButton.tsx` (Client Component)**:
   - Self-service booking cancellation button for passengers. Displays a modal confirmation dialogue before invoking `cancelBooking(bookingId)`.

7. **`ClearHistoryButton.tsx` (Client Component)**:
   - Client trigger for operators to filter out past bookings by setting an `operator_cleared_time` cookie.

---

## 8. State Management, Realtime Sync & Concurrency Controls

### 8.1 Server-Authoritative Architecture
The application avoids client-side caching stores (such as Redux or Zustand) in favor of Next.js 16 Server Components and server-authoritative data synchronization:
1. **Initial Hydration**: Server Components fetch directly from Supabase via `createServerClient`. No client-side `useEffect` data-fetching waterfalls occur on initial render.
2. **Mutations**: Triggered via Server Actions. Mutations execute atomic PostgreSQL functions.
3. **Invalidation**: Actions invoke `revalidatePath('/')` or `revalidatePath('/operator', 'page')`, evicting Next.js Data Cache and Full Route Cache.
4. **Realtime Broadcast**: Supabase Realtime publishes PostgreSQL write-ahead log (WAL) events to client WebSockets. `LiveBookingsRefresher` captures events and calls `router.refresh()`, triggering instant Server Component re-rendering without a full page reload.

### 8.2 Concurrency & Overbooking Elimination
In high-demand scenarios (such as festival travel in Barak Valley), multiple passengers often attempt to book the last available seat on a bus simultaneously.
- **Vulnerability of Standard Patterns**: Traditional `SELECT available_seats` followed by `UPDATE available_seats` suffers from time-of-check to time-of-use (TOCTOU) race conditions.
- **Pather Saathi Resolution**: The database executes `book_seats()` with an atomic conditional decrement:
  ```sql
  UPDATE public.schedules
  SET available_seats = available_seats - p_seats_requested
  WHERE id = p_schedule_id
    AND available_seats >= p_seats_requested
    AND status = 'scheduled'
    AND deleted_at IS NULL;
  ```
  PostgreSQL locks the row during update. If two transactions arrive simultaneously, the second transaction sees the decremented value; if seats are depleted, `ROW_COUNT` returns 0, and the function returns `false`, gracefully prompting the second customer to pick another departure.

### 8.3 Distributed Rate Limiting
To protect against automated seat-locking denial-of-service (DoS) attacks:
- Configured in `frontend/src/lib/ratelimit.ts` via `@upstash/ratelimit` and `@upstash/redis`.
- Uses a **sliding window of 3 requests per 60 seconds** keyed on authenticated `user.id`.
- Rejects excess requests with `'Too many booking attempts. Please wait before trying again.'`

---

## 9. Security Posture & Adversarial Findings

The codebase underwent an adversarial security audit documented in `SECURITY_AUDIT_REPORT.md` (overall security rating: 72/100). Below is a summary of current protections and identified vulnerabilities:

### 9.1 Multi-Layer Defense Architecture
1. **HTTP Security Headers (`frontend/next.config.ts`)**:
   - `X-Frame-Options: DENY` (Clickjacking mitigation)
   - `X-Content-Type-Options: nosniff` (MIME sniffing prevention)
   - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS enforcement)
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-DNS-Prefetch-Control: on`
2. **Session Verification**: Always invokes `supabase.auth.getUser()` to cryptographically validate JWT signatures against Supabase GoTrue Auth, avoiding forged cookie vulnerabilities.
3. **Database Function Protection**: All `SECURITY DEFINER` procedures specify `SET search_path = public` to prevent malicious schema hijacking.
4. **Anti-Recursion Security**: `public.user_owns_booking()` breaks cyclic dependencies between `bookings` and `booking_vehicles` under RLS.

### 9.2 Key Audit Vulnerabilities & Remediation Tracker

| Vulnerability ID | Severity | File Location | Root Cause | Remediation Strategy |
|---|---|---|---|---|
| **SEC-01** | Critical | `supabase/migrations/20260603000003_seed_frontend_data.sql:29-30` | Plaintext operator password (`Ps@Oper2026!`) committed in seed migration. | Rotate password on production instance; remove hardcoded passwords from version control. |
| **SEC-02** | High | `frontend/next.config.ts` | Missing `Content-Security-Policy` (CSP) header. | Deploy strict CSP restricting script, style, and WebSocket connection sources. |
| **SEC-03** | Medium | `src/app/login/actions.ts:50` vs `src/app/profile/actions.ts:7` | Phone regex mismatch (`/^\+[1-9]\d{1,14}$/` vs `/^\+91[0-9]{10}$/`). Users registering with non-+91 numbers cannot update profile. | Standardize on a shared validation module enforcing Indian `+91` format across all modules. |
| **SEC-04** | Medium | `frontend/src/proxy.ts` | Next.js App Router expects `middleware.ts` rather than `proxy.ts`. Edge token refresher may fail to execute in production builds. | Rename `src/proxy.ts` to `src/middleware.ts` or export standard middleware wrapper. |
| **SEC-05** | Low | `frontend/src/types/database.types.ts` | TypeScript definitions out of sync with migration `20260902000001_driver_and_live_tracking.sql` (`trip_locations` missing). | Regenerate types via Supabase CLI (`supabase gen types typescript`). |

---

## 10. Gap Analysis & Roadmap for Downstream Planners

This section delineates the exact delta between the current codebase state and the objectives established in `ORIGINAL_REQUEST.md`:

### 10.1 Requirement R1: Codebase Audit & Documentation
- **Status**: **COMPLETE**.
- Authoritative audit authored in this document, referencing Graphify knowledge graph metrics (484 nodes, 546 edges, 95 communities), physical directory layout, and database migrations.

### 10.2 Requirement R2: Driver Module & Live Tracking Integration
- **Database Status**: Foundation already created in migration `20260902000001_driver_and_live_tracking.sql` (`trip_locations` table, `driver_start_trip`, `driver_end_trip`, `schedules.driver_id`, Realtime publication).
- **Missing Application Components**:
  - **No Driver Web UI**: There is no `/driver` route, no simplified driver interface, and no driver login flow.
  - **Low-Literacy UX Design**: Drivers require high-contrast, zero-typing controls ("Start Trip" and "End Trip" primary buttons with audio confirmation and local Bengali/Assamese language labels).
  - **Geolocation Background Watcher**: Need client-side `navigator.geolocation.watchPosition` script transmitting breadcrumbs to `trip_locations` at regular intervals (5-10 seconds) with offline queuing.
  - **Passenger Live Tracking Map**: Commuters currently have no map view. An interactive Leaflet/MapLibre component is needed on `/bookings` to visualize active bus locations and estimated arrival times.

### 10.3 Requirement R3: Operator Dashboard & Recurring Schedules
- **Current Limitation**: Operators can only generate schedules statically up to 30 days in advance via a `for` loop in `src/app/operator/fleet/actions.ts:upsertSchedule`. There is no recurring schedule template or pause capability.
- **Missing Application Components**:
  - **Recurring Schedule Templates**: A `recurring_schedules` table defining days of the week, departure time, and vehicle assignment, coupled with a daily `pg_cron` generation job.
  - **Service Alert & "Not Running Today" Broadcast**: Table `operator_broadcasts` or `service_alerts` allowing operators to mark a bus or route as inactive for the day, with an alert banner displayed on the home page.
  - **Privacy Policy Page**: No `/privacy` page currently exists. Must be implemented detailing location tracking disclosures and user rights.

### 10.4 Requirement R4: Authentication & Security Modernization
- **Current Limitation**: The platform relies solely on email and password. In Tier 3 regional environments, users frequently lack dedicated email inboxes or forget passwords.
- **Missing Application Components**:
  - **Passwordless Magic Links**: Supabase GoTrue `signInWithOtp({ email })` integration.
  - **Phone Number SMS / OTP Authentication**: Integration with low-cost Indian SMS providers (Fast2SMS, MSG91, Twilio) compatible with Supabase Auth Phone Provider.
  - **OAuth Integration**: Google OAuth sign-in flow for one-tap mobile authentication.
  - **Forgot Password Recovery Flow**: UI and server action for requesting and resetting passwords.

---

## 11. Verification & Compliance Checklist

- [x] Document accurately reflects the codebase architecture and exact file paths on disk.
- [x] Graphify knowledge graph outputs cited: 484 nodes, 546 edges, 95 communities, god nodes, and community clusters.
- [x] Complete inventory of 9 tables, 29 migrations, foreign keys, RLS policies, and stored procedures.
- [x] All server actions documented across `actions.ts`, `fleet/actions.ts`, `login/actions.ts`, `profile/actions.ts`, `operator/actions.ts`, `bookings/actions.ts`, `auth/actions.ts`.
- [x] Frontend route tree and component hierarchy documented, including the interaction model of the root route (`/`).
- [x] Realtime sync, rate limiting, and concurrency controls detailed.
- [x] Security vulnerabilities and gap analysis for downstream implementation plans provided.
