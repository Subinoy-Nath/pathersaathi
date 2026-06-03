# Pather Saathi: Master Context Document

## SECTION 1: PROJECT IDENTITY

- **Project Name**: Pather Saathi
- **Purpose**: A comprehensive fleet booking and management platform bridging the gap between local transport operators and commuters.
- **Target Geography**: Barak Valley, Assam, India (primarily Silchar and surrounding regional transit).
- **The Exact Problem Solved**: Operational fragmentation in regional transport. Commuters face uncertainty regarding bus schedules, seat availability, and operator reliability. Operators lack a centralized, digital dashboard to manage bookings, track revenue, and organize their vehicle fleets efficiently.
- **End Users**: 
  - **Customers (Commuters)**: Low-to-medium technical literacy. Mostly mobile users relying on mid-range Android devices. Need simple booking, real-time ticket availability, and WhatsApp integrations.
  - **Operators (Fleet Owners)**: Medium technical literacy. Need a dashboard to approve/reject bookings, manage vehicles, and track daily operations. Use both desktop and mobile.
- **Business Model**: Currently deployed as an MVP utility platform. No commission structure is actively enforced in the code yet; it acts as a digital infrastructure layer connecting passengers to verified fleets.
- **Deployment Status**: Production deployment via Vercel. Database hosted on Supabase.
- **Presentation Date / Academic Context**: Finalizing the high-fidelity UI overhaul (Glassmorphism design system) and backend integration for final academic/project presentation (Date: June 2026).

---

## SECTION 2: FULL TECHNOLOGY STACK

| Layer | Technology | Version | Role | Why Chosen | Known Limits |
|-------|------------|---------|------|------------|--------------|
| **Frontend Framework** | Next.js (App Router) | 16.2.6 | Full-stack React framework serving SSR UI and Server Actions. | Built-in API routes, Server Actions for secure DB mutations, and seamless Vercel integration. | Strict boundaries between `use client` and server code require careful state management. |
| **UI Styling** | Tailwind CSS | v4 | Utility-first CSS framework for layout, theming, and glassmorphism. | Rapid prototyping, zero-runtime CSS, built-in PostCSS optimizations for production. | `@import` ordering bugs required workarounds for external fonts. Heavy backdrop filters can cause repaints on low-end Androids (mitigated via `@supports` fallbacks). |
| **Component Architecture** | React | 19.2.4 | UI component building. | Industry standard, deeply integrated with Next.js. | Requires explicit `"use client"` directives for hooks like `useState`. |
| **Database & Auth** | Supabase | 2.107.0 | PostgreSQL Database, GoTrue Auth, and Row-Level Security (RLS). | Instant API generation, robust RLS for multi-tenant isolation, and built-in auth logic. | RLS recursion bugs required deep PostgreSQL knowledge and `SECURITY DEFINER` RPC fixes. |
| **ORM / Query Method** | Supabase JS Client | 2.107.0 | Data fetching and mutations. | Native TypeScript support and direct translation to PostgREST API. | N/A |
| **Hosting** | Vercel | Latest | Edge caching, CI/CD pipeline, and serverless execution. | Zero-config deployment for Next.js. | Serverless function cold starts can slightly delay initial Server Action execution. |
| **Rate Limiting** | Upstash Redis | 1.38.0 | API rate limiting to prevent spam bookings. | Serverless Redis, incredibly fast, perfect for Edge/Serverless environments. | Requires external KV store dependency. |
| **AI Development Tools** | Google Antigravity + Gemini 2.0 Pro | Latest | Core code generation, security modeling, and context extraction. | Deep filesystem access, tool-chain capabilities (MCP), and autonomous planning loops. | N/A |
| **MCP Servers Used** | Supabase MCP, Stitch MCP | N/A | Supabase MCP for DB introspection/migrations. Stitch MCP for high-fidelity UI generation. | Enabled autonomous AI interactions directly with cloud infrastructure. | N/A |

---

## SECTION 3: REPOSITORY STRUCTURE

- `/frontend/src/app/layout.tsx`
  - **Type**: Server Component
  - **Purpose**: Root HTML shell, injects global CSS, Material Symbols fonts, and the shared Navbar.
  - **Calls**: `NavbarServer`, `globals.css`.
  - **Security sensitive**: NO.
- `/frontend/src/app/page.tsx`
  - **Type**: Server Component
  - **Purpose**: Fetches locations and active vehicles from Supabase, passes them to `HomeClient`.
  - **Calls**: Supabase DB (`locations`, `vehicles`), `HomeClient`.
  - **Security sensitive**: NO.
- `/frontend/src/app/HomeClient.tsx`
  - **Type**: Client Component
  - **Purpose**: Handles user interactions for ticket booking and whole-vehicle charter forms.
  - **Calls**: `createTicketBooking`, `createWholeVehicleBooking` Server Actions.
  - **Security sensitive**: NO.
- `/frontend/src/app/actions.ts`
  - **Type**: Server Action
  - **Purpose**: Core business logic for booking creation, including atomic seat reservation and rate limiting.
  - **Called by**: `HomeClient`.
  - **Calls**: Upstash Redis, Supabase RPC (`book_seats`, `restore_seats`), Supabase insert.
  - **Security sensitive**: YES — executes financial/inventory logic, bypasses RLS for atomic seat counts.
- `/frontend/src/app/login/page.tsx` & `LoginForm.tsx`
  - **Type**: Server Component / Client Component
  - **Purpose**: Renders the login/signup UI, manages tab state, and submits auth forms.
  - **Calls**: `login`, `signup` Server Actions.
  - **Security sensitive**: NO.
- `/frontend/src/app/login/actions.ts`
  - **Type**: Server Action
  - **Purpose**: Handles Supabase GoTrue authentication (signIn, signUp).
  - **Calls**: `supabase.auth.signInWithPassword`, `supabase.auth.signUp`.
  - **Security sensitive**: YES — processes raw credentials.
- `/frontend/src/app/auth/actions.ts`
  - **Type**: Server Action
  - **Purpose**: Handles session termination (logout).
  - **Calls**: `supabase.auth.signOut`.
  - **Security sensitive**: YES — manages session state.
- `/frontend/src/middleware.ts`
  - **Type**: Edge Middleware
  - **Purpose**: Refreshes Supabase session tokens on every route request.
  - **Calls**: `updateSession`.
  - **Security sensitive**: YES — critical for preventing premature session expiry.
- `/frontend/src/app/operator/page.tsx`
  - **Type**: Server Component
  - **Purpose**: The main dashboard for operators to view pending and approved bookings for their fleet.
  - **Calls**: Supabase DB (`bookings`), `BookingActionButtons`.
  - **Security sensitive**: YES — displays PII; relies on Supabase RLS to filter data exclusively to the logged-in operator.
- `/frontend/src/app/operator/actions.ts`
  - **Type**: Server Action
  - **Purpose**: Processes operator decisions (approve, reject, cancel) on bookings.
  - **Calls**: Supabase RPC (`update_booking_status_atomic`).
  - **Security sensitive**: YES — mutates booking states and writes audit logs.
- `/frontend/src/app/operator/fleet/FleetClient.tsx`
  - **Type**: Client Component
  - **Purpose**: Tabbed interface for managing vehicles, routes, and schedules. Uses CSS toggling to preserve form state.
  - **Security sensitive**: NO.

---

## SECTION 4: DATABASE SCHEMA — COMPLETE

### Tables

**`users`**
- **Purpose**: Mirrors Supabase Auth, stores extended profile data and roles.
- **Columns**:
  - `id`: uuid, PK, FK to `auth.users(id)` ON DELETE CASCADE
  - `email`: text, UNIQUE, NOT NULL
  - `name`: text, NOT NULL
  - `phone_number`: text, UNIQUE
  - `whatsapp_number`: text
  - `role`: text, NOT NULL, DEFAULT 'customer', CHECK (role IN ('customer', 'operator'))
  - `verification_status`: text, DEFAULT 'unverified'
  - `operator_business_details`: jsonb
  - `created_at`, `updated_at`, `deleted_at`: timestampz
- **RLS**: YES
- **Policies**: Users can read/update their own profile.

**`locations`**
- **Purpose**: Central dictionary of physical stops/cities.
- **Columns**: `id` (uuid, PK), `name` (text, NOT NULL), `description` (text), timestamps.
- **RLS**: YES. Public read (non-deleted). Admin/Operator write.

**`vehicles`**
- **Purpose**: Fleet inventory.
- **Columns**: `id` (uuid, PK), `owner_id` (uuid, FK to `users` ON DELETE CASCADE), `name` (text, NOT NULL), `registration_number` (text), `capacity_seats` (integer, NOT NULL), `vehicle_type` (text), `is_active` (boolean, DEFAULT true), `features` (text), timestamps.
- **RLS**: YES. Public read (active). Owner full access.

**`routes`**
- **Purpose**: Defines A-to-B transit paths.
- **Columns**: `id` (uuid, PK), `owner_id` (uuid, FK to `users`), `origin_id` (uuid, FK to `locations`), `destination_id` (uuid, FK to `locations`), `distance_km` (numeric), `is_active` (boolean), timestamps.
- **RLS**: YES. Public read. Owner full access.

**`schedules`**
- **Purpose**: Specific instances of routes at specific times.
- **Columns**: `id` (uuid, PK), `route_id` (uuid, FK to `routes` ON DELETE CASCADE), `vehicle_id` (uuid, FK to `vehicles`), `departure_time` (timestampz), `arrival_time` (timestampz), `total_seats` (int), `available_seats` (int, CHECK >= 0), `base_fare` (numeric), `status` (text), timestamps.
- **RLS**: YES. Public read. Owner full access.

**`bookings`**
- **Purpose**: Master record of passenger bookings.
- **Columns**:
  - `id`: uuid, PK
  - `customer_id`: uuid, FK to `users` ON DELETE CASCADE
  - `booking_reference`: text, UNIQUE, NOT NULL
  - `booking_type`: text, CHECK IN ('ticket', 'whole_vehicle')
  - `schedule_id`: uuid, FK to `schedules` (nullable, required if ticket)
  - `travel_date`: date, NOT NULL
  - `start_date`, `end_date`: timestampz (for whole vehicle)
  - `seats_requested`: integer
  - `status`: text, DEFAULT 'pending', CHECK IN ('pending','approved','rejected','cancelled','completed','expired')
  - `total_price`: numeric
  - `operator_notes`: text
  - timestamps.
- **RLS**: YES. Customers can read/update their own. Operators can read bookings where they own the associated schedule or vehicle.

**`booking_vehicles`**
- **Purpose**: Junction table linking multiple vehicles to a single `whole_vehicle` booking.
- **Columns**: `id` (uuid, PK), `booking_id` (uuid, FK to `bookings`), `vehicle_id` (uuid, FK to `vehicles`), timestamps.
- **RLS**: YES. Customer insert allowed during booking creation.

**`booking_events`**
- **Purpose**: Immutable audit log of all state transitions.
- **Columns**: `id`, `booking_id` (FK), `actor_id` (FK), `from_status`, `to_status`, `reason`, `created_at`.
- **RLS**: YES. Read-only for customers/operators. Inserted via Triggers.

### Standalone PostgreSQL Functions (RPCs)

1. **`book_seats(p_schedule_id, p_seats_requested)`**
   - **Language**: plpgsql
   - **Context**: SECURITY DEFINER
   - **Purpose**: Atomically decrements `available_seats` on a schedule. Returns boolean. Prevents race conditions.
2. **`restore_seats(p_schedule_id, p_seats_to_restore)`**
   - **Language**: plpgsql
   - **Context**: SECURITY DEFINER
   - **Purpose**: Atomically increments `available_seats` if a booking transaction fails or is cancelled.
3. **`update_booking_status_atomic(p_booking_id, p_operator_id, p_new_status, p_reason)`**
   - **Language**: plpgsql
   - **Context**: SECURITY DEFINER
   - **Purpose**: Safely transitions a booking state, validating that the operator actually owns the vehicle/schedule attached to the booking, and automatically restores seats if a booking is rejected/cancelled.
4. **`expire_stale_bookings()`**
   - **Language**: plpgsql
   - **Context**: SECURITY DEFINER
   - **Purpose**: Finds `pending` bookings older than 24 hours, marks them `expired`, and restores their allocated seats.
5. **`user_owns_booking(p_booking_id, p_user_id)`**
   - **Language**: sql
   - **Context**: SECURITY DEFINER
   - **Purpose**: Evaluates operator ownership of a booking to prevent the RLS infinite recursion bug between `bookings` and `booking_vehicles`.

### `pg_cron` Jobs
- **Schedule**: `0 * * * *` (Hourly)
- **Function**: `SELECT expire_stale_bookings();`
- **Purpose**: Automated cleanup of abandoned bookings.

---

## SECTION 5: AUTHENTICATION & AUTHORIZATION FLOW

1. **Signup Flow**: User submits form → `actions.ts` validates E.164 phone + length → Calls `supabase.auth.signUp` → Supabase creates `auth.users` record → Database Trigger (`on_auth_user_created`) fires → Safely inserts a mirrored row into `public.users` mapping the role and phone number.
2. **Login Flow**: User submits form → `actions.ts` calls `supabase.auth.signInWithPassword` → Supabase generates JWT session cookie → User redirected to home.
3. **Session Validation Pattern**: The application relies on `@supabase/ssr` `getUser()` to validate server-side auth. `getSession()` is explicitly avoided for auth checks as it only reads the cookie without cryptographically verifying the token signature against the Supabase server.
4. **Logout Flow**: Client calls Server Action `logout()` → Calls `supabase.auth.signOut()` → Next.js cache is revalidated.
5. **Role Check**: Role is stored in `public.users`. It is extracted by querying the `users` table using the ID retrieved from `getUser()`.
6. **Unauthorised Access**: If a Customer accesses `/operator`, the Server Component intercepts the role check and redirects or returns an unauthorized error state.

**RBAC Matrix**:

| Route | Guest | Customer | Operator | Admin |
|-------|-------|----------|----------|-------|
| `/` | ALLOW | ALLOW | ALLOW | ALLOW |
| `/login` | ALLOW | REDIRECT | REDIRECT | REDIRECT |
| `/bookings` | DENY | ALLOW | ALLOW | ALLOW |
| `/operator/*` | DENY | DENY | ALLOW | ALLOW |

---

## SECTION 6: EVERY SERVER ACTION — COMPLETE SPEC

### `createTicketBooking` — `src/app/actions.ts`
- **Purpose**: Processes a customer request to book individual seats on a schedule.
- **Caller role required**: Customer / Operator
- **Input**: `pickup`, `destination`, `seats`, `travelDate` (via FormData)
- **Security checks**: 
  1. `getUser()` authentication check.
  2. Upstash Redis rate limiting.
  3. Input sanitization (prevent identical pickup/dropoff).
- **Database operations**:
  1. Find active routes matching pickup/destination.
  2. Find schedules for the route with sufficient `available_seats`.
  3. Execute `book_seats()` RPC (Atomic seat reservation).
  4. Insert record into `bookings` table.
  5. (Rollback): If `bookings` insert fails, execute `restore_seats()` RPC.
- **Return shape**: `{ success: boolean, error?: string, booking_reference?: string, operator_whatsapp?: string }`
- **Side effects**: Decrements `schedules.available_seats`. Revalidates Next.js cache.

### `createWholeVehicleBooking` — `src/app/actions.ts`
- **Purpose**: Processes a request to charter entire buses for a date range.
- **Caller role required**: Customer / Operator
- **Security checks**: 
  1. Auth check.
  2. Rate limit check.
  3. Validate vehicle IDs (UUID regex, 1-5 max limit).
  4. Date chronological order validation.
- **Database operations**:
  1. Verify requested vehicles exist and are active.
  2. Insert record into `bookings` (`booking_type: whole_vehicle`).
  3. Insert links into `booking_vehicles` junction table.
  4. (Rollback): If junction insert fails, mark booking as `cancelled`.
- **Side effects**: Revalidates Next.js cache.

### `updateBookingStatus` — `src/app/operator/actions.ts`
- **Purpose**: Operator dashboard action to approve, reject, or cancel a booking.
- **Caller role required**: Operator
- **Security checks**: 
  1. Auth check.
  2. Enforce reason string length if cancelling.
- **Database operations**:
  1. Execute `update_booking_status_atomic` RPC to ensure state transition is valid and owned by the operator. The RPC handles audit logging and seat restoration natively inside PostgreSQL.
- **Side effects**: Revalidates `/operator` path.

---

## SECTION 7: COMPONENT INVENTORY

### `HomeClient.tsx` — Client Component
- **File**: `src/app/HomeClient.tsx`
- **State**: `selectedBuses` (array of string IDs), `ticketLoading`, `ticketResult`, `busLoading`, `busResult`.
- **User interactions**: 
  - Submitting ticket form triggers `createTicketBooking`.
  - Clicking "Select Bus" toggles vehicle ID in `selectedBuses` array.
- **Conditional logic**: If `ticketResult?.success` is true, replaces the booking form with a WhatsApp confirmation deep-link button.

### `Navbar.tsx` — Client Component
- **File**: `src/components/Navbar.tsx`
- **Props**: `user` (Supabase User), `role` (string).
- **State**: `isMenuOpen` (mobile hamburger menu toggle).
- **Conditional logic**: Renders "Dashboard" and "Fleet" links only if `role === 'operator'`.

### `LoginForm.tsx` — Client Component
- **File**: `src/app/login/LoginForm.tsx`
- **Props**: `initialMode`, `message`
- **State**: `isLogin` (boolean toggles between Login and Create Account tabs).
- **Hooks**: `useEffect` listens to URL parameter changes (`initialMode`) to sync the UI tab without requiring a hard refresh.
- **Server Actions called**: `login` and `signup`.

### `FleetClient.tsx` — Client Component
- **File**: `src/app/operator/fleet/FleetClient.tsx`
- **State**: `activeTab` ('vehicles', 'routes', 'schedules').
- **Architecture Note**: Tab contents are toggled using CSS `display: none` (hidden/block) rather than conditional React mounting. This preserves complex unsaved form states when operators switch between tabs.

---

## SECTION 8: SECURITY POSTURE SUMMARY

- **RLS Infinite Recursion Fix**: A devastating recursive loop occurred where the `bookings` policy queried `booking_vehicles`, which in turn queried `bookings` to determine ownership. This crashed PostgreSQL with `ERROR: 42P17`. FIXED by creating a `SECURITY DEFINER` function (`user_owns_booking()`) that performs the lookup natively as the postgres user, breaking the RLS cyclic dependency.
- **Rate Limiting**: Integrated via Upstash Redis `bookingRatelimit.limit(userId)`. In-memory Maps were stripped out because they do not work across Vercel Serverless Edge function cold starts and scale-outs.
- **Atomic Operations**: PostgreSQL functions (`book_seats`, `update_booking_status_atomic`) are heavily leveraged to prevent double-booking race conditions during high concurrency scenarios.
- **HTTP Security Headers**: Enforced via `next.config.js` (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security, Referrer-Policy).
- **Security Definer Search Path**: All `SECURITY DEFINER` functions in the database have their execution path pinned via `SET search_path = public` to prevent malicious function hijacking. Execution privileges for these triggers are revoked from the `public` and `authenticated` roles.

---

## SECTION 9: BUSINESS LOGIC — EVERY WORKFLOW

### Workflow: Ticket Booking
**Trigger**: User clicks "Search Journeys".
**Actor**: Customer
**Steps**:
  1. UI collects Pickup, Destination, Seats, and Date.
  2. `createTicketBooking` Server Action triggered.
  3. Action validates inputs and checks Upstash rate limits.
  4. DB Operation: Queries `routes` and `schedules`.
  5. DB Operation: Atomically executes `book_seats()` RPC.
  6. DB Operation: Inserts record into `bookings` table.
  7. Response returned to client with `booking_reference`.
  8. UI updates to show success screen with a pre-filled WhatsApp link to the operator.
**Edge cases handled**:
  - Race condition where another user books the last seat simultaneously is handled securely via the atomic `book_seats` returning `false`, causing the loop to try the next available bus.

### Workflow: Operator Rejection / Cancellation
**Trigger**: Operator clicks Reject/Cancel on dashboard.
**Actor**: Operator
**Steps**:
  1. UI prompts for a mandatory rejection/cancellation reason.
  2. `updateBookingStatus` Server Action triggered.
  3. DB Operation: `update_booking_status_atomic` executes.
  4. DB securely verifies operator owns the specific booking.
  5. DB updates status, and *automatically executes `restore_seats()`* internally.
  6. DB Trigger fires and writes the transition and reason to `booking_events`.
  7. Next.js cache revalidated.

---

## SECTION 10: AI DEVELOPMENT TOOLCHAIN

- **Google Antigravity + Claude Sonnet 4.6**: Used for initial ideation, high-level architecture planning, security modeling, and formulating the initial component hierarchy.
- **Google Antigravity + Gemini 2.0 Pro**: Utilized as the primary autonomous execution agent. Connected natively to the filesystem to directly generate Next.js components, Server Actions, and Tailwind CSS.
- **Supabase MCP**: Provided the Gemini agent with direct integration to execute complex PostgreSQL migrations (`supabase/migrations/*`) and resolve deep RLS recursion bugs autonomously.
- **Stitch MCP**: Leveraged to define the Glassmorphism design system foundation and iteratively refine the UI aesthetic.
- **Windsurf**: Used in parallel to run adversarial security testing on the Supabase RLS policies and discover the infinite recursion bug.

---

## SECTION 11: KNOWN DEBT & OPEN ISSUES

| ID | Description | Risk | Fix | Est | Priority |
|----|-------------|------|-----|-----|----------|
| **TD-01** | `users.role` enum mismatch in older artifacts. | Documentation drift causing developer confusion. | Fixed in Master Context. | 0h | Resolved |
| **TD-02** | Phone validation regex mismatch between signup and profile. | Users could sign up with international numbers but fail to update their profile later due to strict `+91` checks. | Unify Regex in `auth/actions.ts` to strictly enforce `+91`. | 1h | P1 |
| **TD-03** | Lack of automated email/SMS notifications. | Operators currently rely on WhatsApp links triggered by users. If a user closes the window, the operator is not notified. | Integrate Resend/Twilio on Supabase Insert Webhooks. | 6h | P0 |
| **TD-04** | Deprecated `middleware` file convention in Next.js 15+. | Build warnings. Potential future breaking change. | Migrate `middleware.ts` to the new `proxy` configuration block. | 2h | P2 |

---

## SECTION 12: ENVIRONMENT VARIABLES

- **`NEXT_PUBLIC_SUPABASE_URL`**
  - **Type**: Public
  - **Usage**: Used by `@supabase/ssr` to initialize the client in `utils/supabase/*.ts`.
  - **If missing**: Application instantly crashes; DB queries fail.
  - **Format**: `https://<project-id>.supabase.co`

- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
  - **Type**: Public
  - **Usage**: Used by the Supabase client for authentication and API routing.
  - **If missing**: Auth and DB queries fail.
  - **Format**: `eyJhbGciOiJIUzI1NiIsIn...`

- **`UPSTASH_REDIS_REST_URL`**
  - **Type**: Secret
  - **Usage**: Used by `@upstash/ratelimit` in `src/lib/ratelimit.ts`.
  - **If missing**: Rate limiting fails open (warns in console, allows all traffic).
  - **Format**: `https://<host>.upstash.io`

- **`UPSTASH_REDIS_REST_TOKEN`**
  - **Type**: Secret
  - **Usage**: Authenticates requests to the Upstash Redis database.
  - **If missing**: Rate limiting fails open.
  - **Format**: `A...=`
