# Pather Saathi — Change Log

**Author**: Subinoy Nath  
**Project**: Pather Saathi (Transit & Bus Charter Management Platform)

---

# October 1, 2026

**Date**: October 1, 2026 (2026-10-01)  
**Author**: Subinoy Nath

---

## Overview

Bug fixes, UI enhancements, database schema cleanups, and architectural refinements.

---

## 1. Resolved React `useSyncExternalStore` Warning (Infinite Loop Prevention)

### Issue
During local development and SSR / hydration, React raised the following runtime warning:
> `"The result of getServerSnapshot should be cached to avoid an infinite loop"`

### Root Cause
In [`frontend/src/components/common/BroadcastAlertBanner.tsx`](../frontend/src/components/common/BroadcastAlertBanner.tsx), the `DismissedAlertsStore.getServerSnapshot` method returned a brand-new empty array literal (`[]`) on every invocation (`(): string[] => []`). Because `[] !== []` under `Object.is` reference equality comparison, React treated each call during SSR/hydration as an external store mutation.

### Changes Implemented
- Defined an immutable, cached constant outside the store class:
  ```typescript
  const EMPTY_SNAPSHOT: string[] = []
  ```
- Updated `getServerSnapshot()` and fallback return branches in `getSnapshot()` to return the stable `EMPTY_SNAPSHOT` reference.

---

## 2. Bus Fleet Serial Display (Shibam Coach 01 – 10)

### Requirement
Ensure all buses across the customer booking and operator management cockpits appear sorted serially based on their natural names (`Shibam Coach 01` through `Shibam Coach 10`) rather than arbitrary database insertion order or lexicographical misalignments.

### Changes Implemented
- **Homepage & Whole Bus Charter Booking**:
  - In [`frontend/src/app/page.tsx`](../frontend/src/app/page.tsx): Added `.order('name', { ascending: true })` to the Supabase vehicles query and applied JavaScript natural collation sort:
    ```typescript
    const vehicles = (vehiclesResponse.data || []).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
    )
    ```
  - In [`frontend/src/app/HomeClient.tsx`](../frontend/src/app/HomeClient.tsx): Added a memoized `sortedVehicles` array using natural numeric sorting to render the vehicle cards serially.
- **Operator Dashboard**:
  - In [`frontend/src/app/operator/page.tsx`](../frontend/src/app/operator/page.tsx): Sorted operator-owned vehicles serially.
- **Fleet Management Cockpit**:
  - In [`frontend/src/app/operator/fleet/page.tsx`](../frontend/src/app/operator/fleet/page.tsx): Replaced `created_at DESC` vehicle query ordering with natural numeric sorting by name.
  - In [`frontend/src/app/operator/fleet/FleetClient.tsx`](../frontend/src/app/operator/fleet/FleetClient.tsx): Applied `sortedVehicles` for vehicle lists, schedule creation forms, and template configuration dropdowns.

---

## 3. Single Unified Booking Date & Database Schema Update

### Requirement
In the customer **My Bookings** section, eliminate the redundant and confusing dual dates (`Start Date` and `End Date`). Replace both with a single **Booking Date** (`travel_date`) for all booking types (ticket and whole vehicle charter), and drop the obsolete date columns from the database.

### Database Changes
- **Migration Created**: [`supabase/migrations/20261001000001_remove_booking_start_end_dates.sql`](../supabase/migrations/20261001000001_remove_booking_start_end_dates.sql)
  - Backfills `travel_date` from `start_date` for any legacy records where `travel_date` was null:
    ```sql
    UPDATE public.bookings
    SET travel_date = start_date::DATE
    WHERE travel_date IS NULL AND start_date IS NOT NULL;
    ```
  - Drops `start_date` and `end_date` columns from `public.bookings`:
    ```sql
    ALTER TABLE public.bookings
    DROP COLUMN IF EXISTS start_date,
    DROP COLUMN IF EXISTS end_date;
    ```

### Frontend & Type System Changes
- **Database Types**: Updated [`frontend/src/types/database.types.ts`](../frontend/src/types/database.types.ts) to remove `start_date` and `end_date` from `Row`, `Insert`, and `Update` interfaces for the `bookings` table.
- **Customer Bookings Page**:
  - In [`frontend/src/app/bookings/page.tsx`](../frontend/src/app/bookings/page.tsx):
    - Removed `start_date` and `end_date` from the query selection.
    - Added `occasion` to the query.
    - Updated whole vehicle card layout to display a single **Booking Date** and an optional **Occasion / Purpose** badge.
- **Operator Bookings View**:
  - In [`frontend/src/app/operator/page.tsx`](../frontend/src/app/operator/page.tsx): Removed `start_date` and `end_date` from the query and table cells, rendering the single formatted date for all bookings.

---

## 4. Clear Scheduled Departures in Operator Dashboard & Database

### Requirement
Provide the operator with the capability to clear all scheduled bus runs from the Fleet Monitoring cockpit, with an accompanying database migration to clear existing materialized departures.

### Changes Implemented
- **Database Migration**:
  - Created [`supabase/migrations/20261001000002_clear_scheduled_buses.sql`](../supabase/migrations/20261001000002_clear_scheduled_buses.sql) to soft-delete existing active/scheduled departures across the database and deactivate associated schedule broadcast notifications.
  - Created [`supabase/migrations/20261001000003_fix_schedules_rls.sql`](../supabase/migrations/20261001000003_fix_schedules_rls.sql) to fix PostgreSQL RLS recursive subquery validation by introducing `SECURITY DEFINER` function `operator_owns_vehicle(p_vehicle_id)` and atomic RPC functions `clear_operator_schedules` and `delete_single_schedule_run`.
- **Server Actions**:
  - In [`frontend/src/app/operator/fleet/actions.ts`](../frontend/src/app/operator/fleet/actions.ts): Added `clearAllScheduledRuns()` and `deleteScheduleRun(scheduleId)` leveraging atomic `SECURITY DEFINER` RPCs with clean fallback handling.
- **Fleet Monitoring UI**:
  - In [`frontend/src/app/operator/fleet/FleetClient.tsx`](../frontend/src/app/operator/fleet/FleetClient.tsx): Added **Clear All Runs** button in the schedules toolbar and a per-row delete action with user confirmation prompts.

---

## 5. Verification & Testing

- **Production Build**: Verified with Next.js 16.2.6 Turbopack build (`npm run build`) — Compiled successfully with zero TypeScript or syntax errors.
- **Unit Testing**: Ran unit test suite (`npm test`) covering phone number normalization and SMS OTP flows — All 12 unit tests passing.

---

# October 2, 2026

**Date**: October 2, 2026 (2026-10-02)  
**Author**: Subinoy Nath

---

## Overview

Expanded the scheduling system to handle intermediate route stops and per-station arrival times for buses in transit.

---

## 1. Route Stops & Station Times

### Requirement
Allow routes to define multiple intermediate stops and give schedules (and recurring schedule templates) the capability to define precise arrival times for each station.

### Database Changes
- **Migrations Created**:
  - [`supabase/migrations/20261002000001_route_stops.sql`](../supabase/migrations/20261002000001_route_stops.sql): Created the `public.route_stops` table to manage intermediate stations.
  - [`supabase/migrations/20261002000003_routes_add_name_columns.sql`](../supabase/migrations/20261002000003_routes_add_name_columns.sql): Added cached `origin_name` and `destination_name` columns directly onto `public.routes` via triggers for performance.
  - [`supabase/migrations/20261002000004_schedules_add_station_times.sql`](../supabase/migrations/20261002000004_schedules_add_station_times.sql): Added a `station_times` JSONB column to the `public.schedules` table to persist per-station times.
  - [`supabase/migrations/20261002000005_templates_station_times.sql`](../supabase/migrations/20261002000005_templates_station_times.sql): Added `station_times` JSONB to `public.recurring_schedule_templates` and updated the `generate_rolling_schedules` RPC function to map station times to all newly generated future runs.

---

# October 3, 2026

**Date**: October 3, 2026 (2026-10-03)  
**Author**: Subinoy Nath

---

## Overview

Introduced dynamic fare calculation based on pickup location, destination, and bus type (AC vs Non-AC).

---

## 1. Dynamic Fares & AC Vehicle Support

### Requirement
Implement dynamic pricing that adjusts based on the origin, destination, and whether the vehicle assigned to the route is AC or Non-AC.

### Database Changes
- **Migrations Created**:
  - [`supabase/migrations/20261003000001_fares_and_ac_vehicles.sql`](../supabase/migrations/20261003000001_fares_and_ac_vehicles.sql)
    - Added an `is_ac` boolean column to the `public.vehicles` table.
    - Created a new `public.fares` table mapping `origin_id`, `destination_id`, and `is_ac` to a specific `fare_amount` price.
  - [`supabase/migrations/20261003000002_seed_fares_data.sql`](../supabase/migrations/20261003000002_seed_fares_data.sql)
    - Seeded sample pricing data between key locations (e.g., Silchar and Sribhumi).

### Frontend Changes
- **Backend Query Updates**:
  - In `frontend/src/app/actions.ts`: Updated the `searchSchedules` API to read the `is_ac` flag of assigned vehicles and lookup the custom fare for that specific origin-destination pair from the `fares` table, falling back to the standard base fare when no specific route override is found.
- **UI Updates**:
  - In `frontend/src/app/HomeClient.tsx`: Updated vehicle cards to visibly display an **AC** or **Non-AC** badge next to the bus name.

---

## 2. Bus Tracking, Search & Dynamic UI Fixes

### Issues Resolved
- **AC / Non-AC Display Bug**: Fixed an issue where the new `is_ac` flag was causing vehicles with AC features to render as "Non-AC". The UI now dynamically infers AC status from the vehicle's `features` text payload.
- **Intermediate Station Searching**: Refactored the `searchSchedules` API to properly allow searching for trips starting and ending at intermediate `route_stops`. Previously, the API mistakenly restricted searches strictly to absolute route origins and destinations.
- **Dynamic Fare Display**: Searching for multi-seat bookings now automatically multiplies and displays the aggregate base fare per the number of requested passengers instead of displaying the single-seat base fare.
- **Date Defaults**: The initial load date across all booking inputs has been explicitly defaulted to today's date in local time instead of rendering blank.
- **Track Bus Timeline UI Refinements**:
  - Completely removed the redundant footer text ("Departs time", "seats free") from live bus tracking cards.
  - Substituted the standard `Origin -> Destination` block with an inclusive chronological timeline of the full bus route path.
  - The new timeline fetches and accurately renders per-station arrival times directly beneath every mapped station using the new `station_times` structure.

---

# October 5, 2026

**Date**: October 5, 2026 (2026-10-05)  
**Author**: Subinoy Nath

---

## Overview

Major improvements to the live bus tracking page: road-following map paths via OSRM routing, a redesigned route timeline card with collapsible intermediate stations, AC/Non-AC badge on the vehicle, and removal of the operator assistance section.

---

## 1. Road-Following Map Path (OSRM Integration)

### Issue
The tracking map was drawing a straight displacement line directly between the origin and destination, with no regard for actual roads.

### Changes Implemented
- **New Utility**: [`frontend/src/utils/fetchRoadRoute.ts`](../frontend/src/utils/fetchRoadRoute.ts)
  - Calls the free OSRM public routing API (`router.project-osrm.org`) — no API key required.
  - Returns a `[lat, lng][]` array of waypoints that follow the real road network.
  - Includes graceful 8-second timeout with fallback to a straight line if the network request fails.
- **Map Component**: [`frontend/src/components/map/LeafletMapInner.tsx`](../frontend/src/components/map/LeafletMapInner.tsx)
  - The planned route polyline (origin → destination) now fetches and renders a road-snapped path instead of a 2-point straight line.
  - A dashed straight line is drawn immediately as a placeholder while the OSRM request is in flight, then replaced with the road-following path on response.
  - Uses a `cancelled` flag to safely discard stale OSRM responses after component unmount.

---

## 2. Route Timeline Card (Above Map)

### Requirement
Replace the simple vehicle name + departure time header box with a full, readable route timeline showing all stations and their scheduled times.

### Changes Implemented
- **Tracking Page**: [`frontend/src/app/bookings/track/[scheduleId]/page.tsx`](../frontend/src/app/bookings/track/%5BscheduleId%5D/page.tsx)
  - Expanded the Supabase metadata query to fetch:
    - `arrival_time` — used as the destination arrival time.
    - `station_times` JSONB — per-station scheduled times (`[{ name, stop_order, time }]`).
    - `route_stops` with nested `locations` — ordered list of intermediate stations.
  - Removed the "ছাড়ার সময় / Departure" time box from the header.
  - New **Route Timeline** renders a vertical rail with:
    - 🟢 **Green dot** — Origin station with departure time.
    - 🔵 **Blue dots** — Intermediate stops (collapsible, see below) with scheduled times from `station_times`, fuzzy-matched by name.
    - 🔴 **Red dot** — Destination station with arrival time.
    - Shows `—` gracefully for any station without a known time.

---

## 3. Collapsible Intermediate Stations

### Requirement
Intermediate stops should not be shown by default — users should choose to expand them.

### Changes Implemented
- Added `stopsOpen` state (default `false`).
- Origin and Destination are always visible.
- A toggle button between them shows `"N intermediate stops ▼"` when collapsed and `"Hide intermediate stops ▲"` when expanded.
- A subtle connector line is shown when collapsed so the user knows stops exist in between.

---

## 4. AC / Non-AC Badge on Vehicle

### Requirement
Display whether the bus is air-conditioned next to the vehicle registration number in the tracking header.

### Changes Implemented
- Added `features` field to the vehicles Supabase select alongside the existing `is_ac` boolean.
- AC detection now mirrors `actions.ts` logic — trusts `is_ac` column first, then falls back to checking `features` text for `"AC"`:
  ```ts
  const isACFromFeatures = featuresText.includes('AC') && !featuresText.includes('Non-AC')
  const isAC = v?.is_ac === true || isACFromFeatures
  ```
- Renders **`❄️ AC`** (blue pill) or **`Non-AC`** (gray pill) beside the vehicle registration badge.
- **Bug Fixed**: Shivam Coach 2 (and similar vehicles) where `is_ac` DB column was `false` but `features` correctly contained `"AC"` now correctly show as AC.

---

## 5. Operator Assistance Section Removed

### Requirement
Remove the operator call/WhatsApp contact section from the tracking page entirely.

### Changes Implemented
- Removed the entire "সহায়তা ও অনুসন্ধান / OPERATOR ASSISTANCE" card from the tracking page.
- Removed unused `operatorPhone` and `operatorName` fields from the `MetaData` interface.
- Removed unused `Phone` and `MessageSquare` lucide-react imports.
- The Telemetry HUD (speed, freshness, GPS coordinates) now spans full width instead of half.
---

## 6. Satellite Map Hybrid View

### Requirement
Provide a high-detail Satellite view option for users on the live tracking map, similar to Google Maps, with clearly visible roads and place names.

### Changes Implemented
- **Map Component**: [`frontend/src/components/map/LeafletMapInner.tsx`](../frontend/src/components/map/LeafletMapInner.tsx)
  - Added Leaflet `L.control.layers` to allow toggling between **Street View** (default) and **Satellite View**.
  - Implemented a "Hybrid" Satellite view by stacking three Esri layers using `L.layerGroup`:
    1. Base satellite imagery (`World_Imagery`).
    2. Transparent transportation/road network layer (`World_Transportation`).
    3. Transparent boundaries and place names layer (`World_Boundaries_and_Places`).
  - Added custom `pane: 'overlayPane'` definitions to ensure labels and roads always render clearly on top of the satellite imagery.

---

## 7. Map Polyline Styling

### Requirement
Ensure the planned route line between the origin and destination is highly visible on both light (Street) and dark (Satellite) map backgrounds.

### Changes Implemented
- **Map Component**: [`frontend/src/components/map/LeafletMapInner.tsx`](../frontend/src/components/map/LeafletMapInner.tsx)
  - Changed the default fallback and resolved OSRM polyline color from dark teal (`#004D40`) to a highly vibrant, standard route blue (`#0078FF`).
  - Increased line weight (thickness) to `5` and boosted the resolved solid line opacity to `0.85`.

---

# October 6, 2026

**Date**: October 6, 2026 (2026-10-06)  
**Author**: Subinoy Nath

---

## Overview

Milestone M2: Implemented the full driver module and real-time passenger live tracking system with offline resilience, acoustic feedback, and a dynamic Leaflet map.

---

## 1. Driver HUD (Low-Literacy, OLED High-Contrast UI)

### Requirement
Build a driver-facing interface that is usable by drivers with low digital literacy, optimised for OLED screens, and reliable in poor connectivity conditions.

### Changes Implemented
- **Driver App Layout**: [`frontend/src/app/driver/layout.tsx`](../frontend/src/app/driver/layout.tsx) — Standalone layout isolating the driver app from the main passenger app chrome.
- **Driver Login**: [`frontend/src/app/driver/login/page.tsx`](../frontend/src/app/driver/login/page.tsx) — Dedicated driver login screen using phone + OTP, distinct from passenger auth.
- **Driver Cockpit** (home): [`frontend/src/app/driver/page.tsx`](../frontend/src/app/driver/page.tsx) — Shows today's assigned schedule and a single large **Start Trip** CTA.
- **Active Trip HUD**: [`frontend/src/app/driver/trip/[scheduleId]/page.tsx`](../frontend/src/app/driver/trip/%5BscheduleId%5D/page.tsx)
  - Live speed, GPS coordinates, and connectivity status displayed in an at-a-glance HUD.
  - **2-second hold-to-end** gesture to prevent accidental trip termination.
- **Trip Summary**: [`frontend/src/app/driver/summary/[scheduleId]/page.tsx`](../frontend/src/app/driver/summary/%5BscheduleId%5D/page.tsx) — Post-trip summary with distance, duration, and average speed.
- **Route Protection**: [`frontend/src/utils/supabase/middleware.ts`](../frontend/src/utils/supabase/middleware.ts) — `/driver` routes are now protected and redirect unauthenticated users to `/driver/login`.

---

## 2. GPS Watcher Hook with Adaptive Throttling

### Changes Implemented
- **New Hook**: [`frontend/src/hooks/useDriverLocation.ts`](../frontend/src/hooks/useDriverLocation.ts)
  - Uses HTML5 `watchPosition` with high-accuracy mode.
  - **15-metre distance jitter filter** discards GPS noise when the bus is stationary.
  - **Adaptive speed throttling**: update interval shortens at higher speeds for accurate map rendering and lengthens at low speeds to conserve bandwidth and battery.

---

## 3. Offline GPS Ring Buffer (IndexedDB)

### Changes Implemented
- **New Utility**: [`frontend/src/utils/offlineGpsBuffer.ts`](../frontend/src/utils/offlineGpsBuffer.ts)
  - Implements a **50-point circular ring buffer** backed by IndexedDB.
  - GPS points captured while offline are automatically flushed to Supabase upon reconnection, preventing data loss in low-connectivity regions.

---

## 4. Screen Wake Lock

### Changes Implemented
- **New Hook**: [`frontend/src/hooks/useScreenWakeLock.ts`](../frontend/src/hooks/useScreenWakeLock.ts)
  - Acquires the Web Screen Wake Lock API to prevent the device screen from turning off during an active trip.
  - Automatically re-acquires the lock on `visibilitychange` events (e.g., after the user briefly switches apps).

---

## 5. Web Audio API — Driver Acoustic Cues

### Changes Implemented
- **New Utility**: [`frontend/src/utils/audio.ts`](../frontend/src/utils/audio.ts)
  - Synthesizes distinct audio tones using the Web Audio API (no audio files required) for key driver events:
    - **Trip Start** — ascending success tone.
    - **Trip End** — descending confirmation tone.
    - **Disconnect** — short warning beep.
    - **Reconnect** — recovery tone.

---

## 6. Passenger Live Bus Tracking

### Changes Implemented
- **New Hook**: [`frontend/src/hooks/useLiveBusTracking.ts`](../frontend/src/hooks/useLiveBusTracking.ts)
  - Subscribes to a Supabase Realtime channel on the `trip_locations` table.
  - Streams the driver's GPS coordinates live to all passenger subscribers.
- **Dynamic Leaflet Map Components**:
  - [`frontend/src/components/map/LeafletMapInner.tsx`](../frontend/src/components/map/LeafletMapInner.tsx): Core map with rotating vehicle heading marker and animated radar pulse around the live bus position.
  - [`frontend/src/components/map/LiveBusMap.tsx`](../frontend/src/components/map/LiveBusMap.tsx): Wrapper component with SSR-safe dynamic import.
- **Passenger Tracking Screen**: [`frontend/src/app/bookings/track/[scheduleId]/page.tsx`](../frontend/src/app/bookings/track/%5BscheduleId%5D/page.tsx) — Full live tracking page accessible from passenger bookings.
- **Track Bus Live CTA**: Added a **Track Bus Live** button to the passenger bookings list in [`frontend/src/app/bookings/page.tsx`](../frontend/src/app/bookings/page.tsx), visible only for schedules currently in-progress.

---

# October 7, 2026

**Date**: October 7, 2026 (2026-10-07)  
**Author**: Subinoy Nath

---

## Overview

Milestone M3: Implemented operator recurring schedule templates, automated rolling schedule generation, and dynamic broadcast alerts for service announcements.

---

## 1. Recurring Schedule Templates

### Requirement
Allow operators to define recurring bus schedules (e.g., daily departures) as templates, from which future runs are automatically generated.

### Changes Implemented
- **Fleet Client**: [`frontend/src/app/operator/fleet/FleetClient.tsx`](../frontend/src/app/operator/fleet/FleetClient.tsx)
  - Added a **Recurring Template** creation form allowing the operator to define route, vehicle, departure time, days of operation, and per-station arrival times.
  - Templates are stored in `public.recurring_schedule_templates` with the associated `station_times` JSONB payload.
- **Fleet Actions**: [`frontend/src/app/operator/fleet/actions.ts`](../frontend/src/app/operator/fleet/actions.ts) — Added `createRecurringTemplate()` and `deleteRecurringTemplate()` server actions.
- **Fleet Page**: [`frontend/src/app/operator/fleet/page.tsx`](../frontend/src/app/operator/fleet/page.tsx) — Templates list displayed alongside one-off schedules with delete capability.

---

## 2. Automated Rolling Schedule Generation (`generate_rolling_schedules` RPC)

### Changes Implemented
- Implemented a PostgreSQL `SECURITY DEFINER` function `generate_rolling_schedules` that reads all active recurring templates and materialises schedule runs for the next **14 days** into `public.schedules`.
  - Idempotent: skips dates for which a schedule run already exists.
  - Propagates `station_times` JSONB from the template to each generated run.
- Configured a `pg_cron` job to call this RPC nightly at midnight IST.

---

## 3. Dynamic Broadcast Alerts

### Requirement
Enable operators to create, manage, and broadcast system-wide service announcements (delays, cancellations, diversions) displayed as a dismissable banner to all users.

### Changes Implemented
- **Broadcast Alert Banner**: [`frontend/src/components/common/BroadcastAlertBanner.tsx`](../frontend/src/components/common/BroadcastAlertBanner.tsx)
  - Subscribes to Supabase Realtime on `public.broadcast_alerts`.
  - Displays the most recent active alert as a full-width top banner.
  - Per-alert dismissal is persisted to `localStorage` so dismissed alerts don't reappear.
- **Search Actions**: [`frontend/src/app/actions.ts`](../frontend/src/app/actions.ts) — Updated `searchSchedules` to surface operator-authored schedule-specific alert messages alongside results.
- **Operator Fleet UI**: Alert creation and management controls added to the fleet cockpit.

---

## 4. Homepage & HomeClient Updates

### Changes Implemented
- [`frontend/src/app/HomeClient.tsx`](../frontend/src/app/HomeClient.tsx): Wired up `initialBroadcasts` prop and integrated the `BroadcastAlertBanner` component into the main layout.
- [`frontend/src/app/page.tsx`](../frontend/src/app/page.tsx): Added server-side pre-fetch of active broadcasts passed as `initialBroadcasts` to `HomeClient`.

---

# October 8, 2026

**Date**: October 8, 2026 (2026-10-08)  
**Author**: Subinoy Nath

---

## Overview

Milestone M4: Hardened authentication with PKCE OAuth callback, email-based password recovery, magic link sign-in, a pluggable SMS provider abstraction, and a dedicated Privacy Policy page.

---

## 1. PKCE OAuth Callback Route

### Issue
Magic links and OAuth redirects were not being properly handled after Supabase's Auth v2 PKCE flow, causing session exchange failures in production (especially behind Vercel's reverse proxy).

### Changes Implemented
- **New Route**: [`frontend/src/app/auth/callback/route.ts`](../frontend/src/app/auth/callback/route.ts)
  - Reads `x-forwarded-host` and `x-forwarded-proto` headers to correctly reconstruct the base URL behind reverse proxies.
  - Exchanges the `code` query parameter for a session via `supabase.auth.exchangeCodeForSession(code)`.
  - Validates the `next` redirect parameter against open-redirect attacks (must be a relative path beginning with `/`, no `//`, backslashes, or URI schemes).
  - Gracefully redirects to `/login?message=...` on any auth error or missing code.

---

## 2. Email Password Recovery

### Changes Implemented
- **Auth Actions**: [`frontend/src/app/auth/actions.ts`](../frontend/src/app/auth/actions.ts)
  - `requestPasswordReset(formData)` — calls `supabase.auth.resetPasswordForEmail()` with a dynamic `redirectTo` pointing to `/auth/callback?next=/reset-password`.
  - `completePasswordReset(formData)` — validates password length (≥ 8 chars) and confirmation match before calling `supabase.auth.updateUser({ password })`.
- **Forgot Password Page**: [`frontend/src/app/forgot-password/page.tsx`](../frontend/src/app/forgot-password/page.tsx) — Email input form with success confirmation state.
- **Reset Password Page & Form**: [`frontend/src/app/reset-password/page.tsx`](../frontend/src/app/reset-password/page.tsx) + [`ResetPasswordForm.tsx`](../frontend/src/app/reset-password/ResetPasswordForm.tsx) — New password + confirm password form with show/hide password toggle.

---

## 3. Magic Link Sign-In

### Changes Implemented
- **Auth Actions**: `sendMagicLink(formData)` — sends a one-time magic link email via `supabase.auth.signInWithOtp()` with the `emailRedirectTo` pointing to the PKCE callback.
- **Magic Link Page**: [`frontend/src/app/auth/magic-link/page.tsx`](../frontend/src/app/auth/magic-link/page.tsx) — Standalone page allowing sign-in via email link, presented as a passwordless alternative on the login screen.
- **Login Form Enhancement**: [`frontend/src/app/login/LoginForm.tsx`](../frontend/src/app/login/LoginForm.tsx) — Added eye-icon password show/hide toggle and a link to the magic link page.

---

## 4. Pluggable SMS Provider Abstraction

### Requirement
Decouple the SMS delivery layer from the OTP logic so different providers (Twilio, Fast2SMS, Mock) can be swapped without code changes.

### Changes Implemented
- **New Library** (`frontend/src/lib/sms/`):
  - [`types.ts`](../frontend/src/lib/sms/types.ts) — `SmsProvider` interface with a `sendSms(to, body)` contract.
  - [`mockProvider.ts`](../frontend/src/lib/sms/mockProvider.ts) — Logs messages to console; used in test and development environments.
  - [`twilioProvider.ts`](../frontend/src/lib/sms/twilioProvider.ts) — Twilio REST API integration.
  - [`fast2smsProvider.ts`](../frontend/src/lib/sms/fast2smsProvider.ts) — Fast2SMS integration for Indian mobile numbers.
  - [`index.ts`](../frontend/src/lib/sms/index.ts) — Factory that selects the active provider based on environment variables (`SMS_PROVIDER`, `TWILIO_*`, `FAST2SMS_API_KEY`).
  - [`sms.test.ts`](../frontend/src/lib/sms/sms.test.ts) — Unit tests covering provider selection and mock delivery.
- **Phone Utilities**: [`frontend/src/utils/phone.ts`](../frontend/src/utils/phone.ts) — E.164 phone number normalisation helper with Indian number (`+91`) support.
  - [`phone.test.ts`](../frontend/src/utils/phone.test.ts) — Unit tests for all normalisation edge cases.

---

## 5. Privacy Policy Page

### Changes Implemented
- **New Page**: [`frontend/src/app/privacy/page.tsx`](../frontend/src/app/privacy/page.tsx) — Full privacy policy page covering data collection, usage, storage, and user rights; linked from the site footer and login screen.
- **Footer Component**: [`frontend/src/components/common/Footer.tsx`](../frontend/src/components/common/Footer.tsx) — Extracted the site footer into a standalone, reusable component with links to Privacy Policy and Operator Portal.
- **Navbar**: [`frontend/src/components/Navbar.tsx`](../frontend/src/components/Navbar.tsx) — Added forgot-password and magic link navigation links.

---

## 6. Verification & Testing

- **Production Build**: Verified with Next.js Turbopack build — compiled successfully with zero TypeScript or ESLint errors.
- **Unit Tests**: Ran full test suite (`npm test`) — all **12 unit tests** passing, covering phone normalisation and SMS OTP flows.

---

# October 10, 2026

**Date**: October 10, 2026 (2026-10-10)  
**Author**: Subinoy Nath

---

## Overview

Surfaced live bus tracking directly in the hero section for all logged-in users, independent of bookings. Updated RLS policies to allow open tracking access across the platform.

---

## 1. Open Live Tracking in Hero Section

### Requirement
Any authenticated user (not just ticket holders) should be able to see today's active/upcoming bus runs and track them live directly from the homepage hero section.

### Changes Implemented
- **Homepage Server Component**: [`frontend/src/app/page.tsx`](../frontend/src/app/page.tsx)
  - Fetches today's schedule runs from `public.schedules` (generated by the nightly rolling scheduler) for display in the hero section.
- **HomeClient**: [`frontend/src/app/HomeClient.tsx`](../frontend/src/app/HomeClient.tsx)
  - Added a **"Track Live Buses"** section in the hero that displays today's active schedule cards.
  - Each card shows route, vehicle, departure time, and a direct **Track** CTA routing to `/bookings/track/[scheduleId]`.
  - For unauthenticated users: an intercept modal prompts login before navigating to the tracking page, with a `?redirect=` parameter so the user lands back on the correct tracking page after sign-in.
- **Live Tracking Hook**: [`frontend/src/hooks/useLiveBusTracking.ts`](../frontend/src/hooks/useLiveBusTracking.ts) — Subscribed to the `schedules` table's Realtime publication so hero cards update automatically when a trip goes live or completes.
- **Tracking Page**: [`frontend/src/app/bookings/track/[scheduleId]/page.tsx`](../frontend/src/app/bookings/track/%5BscheduleId%5D/page.tsx) — No longer requires a booking ID; any authenticated user can view any active schedule's live map.
- **Supabase Client**: [`frontend/src/utils/supabase/client.ts`](../frontend/src/utils/supabase/client.ts) — Minor update to improve session persistence for unauthenticated-to-authenticated transitions.
- **Integration Test**: [`frontend/src/tests/heroTrackBusLive.test.ts`](../frontend/src/tests/heroTrackBusLive.test.ts) — Programmatic test verifying that a logged-in user without bookings can fetch today's schedules and route to the tracking page.

---

## 2. Open Tracking RLS Policy Update

### Changes Implemented
- **Migration**: [`supabase/migrations/20260917000001_open_tracking_access.sql`](../supabase/migrations/20260917000001_open_tracking_access.sql)
  - **`trip_locations`**: Replaced the previous booking-gated RLS policy (`"Passengers can view telemetry for booked trip"`) with `"Authenticated users can view telemetry"` — any logged-in user can now read live GPS telemetry.
  - **`schedules`**: Added `public.schedules` to the `supabase_realtime` publication (idempotent check) and replaced the existing public-facing schedule policy with one that surfaces all non-deleted schedules for tracking visibility.
  - **`users`**: Added a new RLS policy `"Authenticated users can view operator and driver profiles"` allowing authenticated users to read operator and driver user profiles for fleet support and dispatch contact.
