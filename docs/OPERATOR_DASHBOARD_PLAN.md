# Operator Dashboard, Recurring Bus Runs, & Legal Compliance: Comprehensive Technical & UX Plan

**Document Reference**: `docs/OPERATOR_DASHBOARD_PLAN.md`  
**Target Milestone**: Requirement R3 (Operator Dashboard & UI/UX Plan)  
**Project**: Pather Saathi (`/home/biswajyoti-nath/Projects/pathersaathi`)  
**Audience**: Engineering Leads, Frontend Developers, Database Administrators, Product Designers, Legal Compliance Auditors  
**Date**: September 2026  
**Status**: Authoritative Architectural Specification  

---

## Table of Contents
1. [Executive Summary & Architectural Scope](#1-executive-summary--architectural-scope)
2. [Deep Audit of Existing Limitations ("As-Is" System)](#2-deep-audit-of-existing-limitations-as-is-system)
   - 2.1 The 30-Day Static Loop Anti-Pattern (`fleet/actions.ts`)
   - 2.2 Lack of Operational Action Controls (`FleetClient.tsx`)
   - 2.3 Absence of Customer Disruption Broadcasts (`HomeClient.tsx` & `actions.ts`)
   - 2.4 Legal & Privacy Deficiencies (`LoginForm.tsx` & Footer)
3. [Screen-by-Screen UX Specifications & ASCII Wireframes](#3-screen-by-screen-ux-specifications--ascii-wireframes)
   - 3.1 Screen 1: Operator Fleet Dashboard — Schedule Management & Action Menus
   - 3.2 Screen 2: Recurring Schedule Template Creation Modal
   - 3.3 Screen 3: Pause Run & Cancellation Modal (with Broadcast Toggle)
   - 3.4 Screen 4: Customer Homepage Service Disruption Alert Banner
   - 3.5 Screen 5: Public Privacy Policy Page (`/privacy`)
4. [Detailed State Management for Recurring Bus Runs](#4-detailed-state-management-for-recurring-bus-runs)
   - 4.1 Bus Run Lifecycle State Machine
   - 4.2 Relational Data Architecture (`recurring_schedule_templates` & `broadcast_notifications`)
   - 4.3 Automated Rolling Schedule Materialization via Supabase `pg_cron`
   - 4.4 Cache Invalidation, SSR Revalidation, & Realtime Broadcast Pipeline
5. [DPDPA 2023 Privacy Policy & Compliance Framework](#5-dpdpa-2023-privacy-policy--compliance-framework)
   - 5.1 Regulatory Jurisdiction & Scope (DPDPA 2023 & IT Rules 2011)
   - 5.2 Personal Data Inventory & Purpose Limitation
   - 5.3 Automated 30-Day Purge Architecture for GPS Telemetry (`trip_locations`)
   - 5.4 Passenger Data Retention & Accounting Safeguards
   - 5.5 Consent Architecture, User Rights, & Grievance Redressal
   - 5.6 Dead Link Remediation in `LoginForm.tsx` & `HomeClient.tsx`
6. [Step-by-Step Technical Implementation Guide](#6-step-by-step-technical-implementation-guide)
   - 6.1 Phase 1: PostgreSQL DDL Migrations & Database Functions
   - 6.2 Phase 2: Server Actions Implementation (`frontend/src/app/operator/fleet/actions.ts`)
   - 6.3 Phase 3: Frontend Component Hierarchy & Next.js Client Wire-Up
   - 6.4 Phase 4: Testing, Verification Matrix, & Rollback Strategy
7. [Traceability & Acceptance Verification](#7-traceability--acceptance-verification)

---

## 1. Executive Summary & Architectural Scope

Pather Saathi is the dedicated regional transit, seat reservation, and whole-vehicle charter platform serving the Barak Valley region of southern Assam, connecting urban and rural transit nodes across **Silchar (Cachar)**, **Sribhumi (Karimganj)**, and **Hailakandi**.

While the initial system established fundamental vehicle tracking schemas and static fleet management, the operator experience currently suffers from severe operational friction:
1. **Manual Schedule Generation**: Fleet managers must manually re-create schedules every month due to an unrolled 30-day static loop in the server actions.
2. **Missing Operational Lifecycle Controls**: Operators cannot pause, delay, cancel, or intervene in scheduled bus runs from their dashboard interface.
3. **Information Asymmetry**: Service disruptions (frequent in Barak Valley due to monsoon flooding, landslides on National Highways NH-6 and NH-37, and mechanical breakdowns) result in blank search results rather than explanatory alerts to passengers.
4. **Regulatory Non-Compliance**: With real-time GPS telemetry ingestion (`trip_locations`) and passenger personal data collection active in the database, the absence of an accessible, DPDPA 2023-compliant Privacy Policy constitutes a legal liability.

This specification provides the complete architectural and UX blueprint to transform Pather Saathi's operator suite into an enterprise-ready transit operations cockpit.

---

## 2. Deep Audit of Existing Limitations ("As-Is" System)

### 2.1 The 30-Day Static Loop Anti-Pattern (`fleet/actions.ts`)
In `frontend/src/app/operator/fleet/actions.ts` (lines 259–283), schedule creation is implemented using a hardcoded iterative loop:

```typescript
// frontend/src/app/operator/fleet/actions.ts:259-283
const repeat_days_str = formData.get('repeat_days') as string
const repeat_days = repeat_days_str ? parseInt(repeat_days_str) : 1

if (isNaN(repeat_days) || repeat_days < 1 || repeat_days > 30) {
  return { success: false, error: 'Repeat days must be between 1 and 30.' }
}

const schedulesToInsert = []

for (let i = 0; i < repeat_days; i++) {
  const iterDeparture = new Date(departureDate.getTime() + i * 24 * 60 * 60 * 1000)
  const iterArrival = new Date(arrivalDate.getTime() + i * 24 * 60 * 60 * 1000)
  
  schedulesToInsert.push({
    vehicle_id,
    route_id,
    departure_time: iterDeparture.toISOString(),
    arrival_time: iterArrival.toISOString(),
    total_seats,
    available_seats: total_seats,
    base_fare,
    status: 'scheduled',
  })
}

const { error: rpcError } = await supabase
  .rpc('upsert_schedules', { p_schedules: schedulesToInsert })
```

#### Critical Failure Modes:
- **Disconnection from Master Identity**: The 30 created records are isolated rows in `public.schedules`. There is no parent entity representing the recurring route rule. If the operator needs to modify departure times (e.g. shifting from 07:30 AM to 08:00 AM), they must update or delete all 30 rows manually.
- **The "30-Day Cliff"**: On day 31, the bus ceases to exist in passenger searches. Operators frequently forget to re-enter schedules, leading to perceived service discontinuation and lost bookings.
- **Database Write Inefficiency**: Bulk-inserting 30 days of data in advance bloats the table with unbooked placeholder rows, complicating search queries and indexing.
- **Lack of Day-of-Week Specificity**: The loop increments daily (`i * 24 * 60 * 60 * 1000`), preventing operators from setting schedules that run only on weekdays, only on weekends, or on specific market days (e.g. Silchar weekly haat days).

### 2.2 Lack of Operational Action Controls (`FleetClient.tsx`)
In `frontend/src/app/operator/fleet/FleetClient.tsx` (lines 470–538), the schedules table renders columns for Vehicle, Route, Departure, Arrival, Seats, Fare, and Status:

```tsx
// frontend/src/app/operator/fleet/FleetClient.tsx:524-533
<td className="px-0 md:px-6 py-4 text-left md:text-center block md:table-cell">
  <div className="md:hidden text-[10px] font-bold text-[#3f4945] uppercase tracking-wider mb-1">Status</div>
  <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full ${
    s.status === 'scheduled' ? 'bg-[#afefdd] text-[#00201a]' :
    s.status === 'completed' ? 'bg-[#cae6ff] text-[#001e30]' :
    'bg-[#e1e3e4] text-[#3f4945]'
  }`}>
    {s.status}
  </span>
</td>
```

#### Critical Failure Modes:
- **No Actions Column**: There are zero action triggers. Operators cannot pause, cancel, reschedule, or delay a run.
- **Static Display Only**: The table is strictly a passive reporting ledger. Even though the database schema supports statuses `'scheduled'`, `'boarding'`, `'in_transit'`, `'completed'`, `'cancelled'`, the operator has no UI interface to change these states.
- **No Batch Operations**: If an entire route is flooded (e.g., Silchar to Hailakandi via Dwarbond road cut off), the operator has no mechanism to bulk-suspend all affected runs for the day.

### 2.3 Absence of Customer Disruption Broadcasts (`HomeClient.tsx` & `actions.ts`)
In `frontend/src/app/actions.ts` (lines 25–75), passenger search executes:

```typescript
// frontend/src/app/actions.ts:65-71
.from('schedules')
.select(`...`)
.eq('route_id', routeId)
.eq('status', 'scheduled')
.is('deleted_at', null)
.gte('departure_time', travelDateObj.toISOString())
.lt('departure_time', nextDay.toISOString())
.gte('available_seats', seats)
```

#### Critical Failure Modes:
- **Silent Failures**: If an operator cancels a run or if no buses run due to emergency roadworks, `searchSchedules` simply returns an empty array. The UI displays: *"No buses with enough available seats found for this route and date."*
- **Confusion & Support Burden**: Passengers cannot differentiate between a fully booked bus and a suspended transit line. This leads to frustrated calls to the helpline (`+91 6002089037`).
- **No Broadcast Notice Board**: The homepage (`frontend/src/app/page.tsx` and `HomeClient.tsx`) queries only `locations` and `vehicles`. There is no table, API endpoint, or visual banner to broadcast urgent regional transit advisories.

### 2.4 Legal & Privacy Deficiencies (`LoginForm.tsx` & Footer)
- **Dead Links in Auth**: In `frontend/src/app/login/LoginForm.tsx` (line 204):
  ```tsx
  By creating an account, you agree to Pather Saathi&apos;s <Link className="text-[#006493] font-semibold underline" href="#">Terms of Service</Link> and <Link className="text-[#006493] font-semibold underline" href="#">Privacy Policy</Link>.
  ```
  Both links navigate to dead anchors (`#`), failing legal notice requirements at the point of consent.
- **Homepage Footer Void**: In `frontend/src/app/HomeClient.tsx` (lines 608–624), the footer contains phone, email, and location details, but zero links to Privacy Policy, Refund Policy, or Terms of Service.
- **DPDPA 2023 Violation**: Migration `20260902000001_driver_and_live_tracking.sql` captures high-precision GPS coordinates (`latitude`, `longitude`, `speed`, `heading`). Collecting and publishing location telemetry without a formal retention policy (e.g. 30-day automated purge) and published legal disclosures violates India's Digital Personal Data Protection Act, 2023.

---

## 3. Screen-by-Screen UX Specifications & ASCII Wireframes

The UI design follows Pather Saathi's established design system:
- **Brand Colors**: Deep Forest Green (`#00342b` / `text-[#00342b]`), Trust Blue (`#006493`), Bright Cyan Accent (`#00affe`), Off-White / Pale Grey Background (`#f8fafb`), Border Grey (`#bfc9c4`).
- **Surface Elevation**: Glassmorphism cards (`glass`, `glass-card`, `border border-white/40`, backdrop blur).
- **Typography**: Clean sans-serif, high contrast, readable on mobile under direct sunlight.

---

### 3.1 Screen 1: Operator Fleet Dashboard — Schedule Management & Action Menus

**Route**: `/operator/fleet?tab=schedules`  
**User Role**: Verified Fleet Operator  

#### Features & Interaction Logic:
1. **View Mode Switcher**:
   - Tab 1: **"Daily Run Instances"** (Concrete departures for today and upcoming dates).
   - Tab 2: **"Recurring Schedule Templates"** (Master operational rules governing automated generation).
2. **Filter & Search Bar**:
   - Date range selector (Today, Next 7 Days, Custom Date).
   - Route dropdown filter.
   - Status pills (`All`, `Scheduled`, `In Transit`, `Completed`, `Paused`, `Cancelled`).
3. **Action Menu per Schedule Row**:
   - `[Pause / Cancel Run]` (Opens Screen 3 modal).
   - `[Broadcast Alert]` (Directly issue a passenger alert for this run).
   - `[Assign Driver]` (Quick-select active driver).
   - `[Edit Fare / Seats]` (Overrides for this specific instance).

```
+====================================================================================================+
|  PATHER SAATHI  •  OPERATOR FLEET COCKPIT                                    [Operator: Shibam] [v] |
+====================================================================================================+
|  [ Vehicles (3) ]   [ Routes (5) ]   [ Schedules (Active) ]                                         |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  SCHEDULE MANAGEMENT                                                                               |
|  Manage recurring route rules and daily concrete departures.                                       |
|                                                                                                    |
|  +-------------------------------------------------------------+  +------------------------------+ |
|  | [ (•) Daily Run Instances ]    [ ( ) Recurring Templates ]  |  | [ + Add Recurring Template ] | |
|  +-------------------------------------------------------------+  +------------------------------+ |
|                                                                                                    |
|  Filter: [ Route: All Routes   v ]  [ Status: Active & Paused v ]  [ Date: Today, 13 Sep 2026 v ] |
|                                                                                                    |
|  +-----------------------------------------------------------------------------------------------+ |
|  | VEHICLE       | ROUTE               | DEP.  | ARR.  | SEATS | FARE  | STATUS    | ACTIONS     | |
|  |---------------+---------------------+-------+-------+-------+-------+-----------+-------------| |
|  | [Bus] Shibam  | Silchar (ISBT) ->   | 07:30 | 09:45 | 28/32 | ₹120  | SCHEDULED | [ Pause v ] | |
|  | Coach 01      | Sribhumi (Town)     | AM    | AM    |       |       | [Active]  | [ Edit    ] | |
|  |---------------+---------------------+-------+-------+-------+-------+-----------+-------------| |
|  | [Bus] Shibam  | Silchar (ISBT) ->   | 08:30 | 10:00 | 14/24 | ₹90   | IN_TRANSIT| [ Track   ] | |
|  | Express Mini  | Hailakandi Bus Stand| AM    | AM    |       |       | ((LIVE))  | [ Details ] | |
|  |---------------+---------------------+-------+-------+-------+-------+-----------+-------------| |
|  | [Bus] Barak   | Sribhumi ->         | 10:15 | 12:30 | 0/32  | ₹120  | PAUSED    | [ Resume  ] | |
|  | Cruiser 02    | Silchar (ISBT)      | AM    | PM    |       |       | [Alert On]| [ Notice  ] | |
|  |---------------+---------------------+-------+-------+-------+-------+-----------+-------------| |
|  | [Bus] Shibam  | Silchar (ISBT) ->   | 02:00 | 04:15 | 32/32 | ₹120  | CANCELLED | [ Reopen  ] | |
|  | Coach 01      | Sribhumi (Town)     | PM    | PM    |       |       | [Roadcut] | [ View Log] | |
|  +-----------------------------------------------------------------------------------------------+ |
|  Showing 1-4 of 18 scheduled runs today               [ < Prev ]  Page 1 of 5  [ Next > ]          |
+====================================================================================================+
```

---

### 3.2 Screen 2: Recurring Schedule Template Creation Modal

**Trigger**: Operator clicks `[ + Add Recurring Template ]`  
**Purpose**: Define a permanent repeating route rule that auto-generates runs nightly.

#### Form Controls:
1. **Vehicle Selector**: Dropdown of operator's active vehicles (e.g., `Shibam Coach 01 (32 seats)`). Auto-populates `total_seats`.
2. **Route Selector**: Dropdown of verified owned routes or system global routes (e.g., `Silchar ISBT -> Sribhumi Town`).
3. **Departure & Estimated Duration**:
   - Departure Time input (e.g., `07:30 AM`).
   - Estimated Duration in minutes (defaults to route duration, e.g., `135 mins`). Automatically calculates estimated arrival time (`09:45 AM`).
4. **Days of Week Selector (Multi-Select Matrix)**:
   - Checkboxes: `[X] Mon  [X] Tue  [X] Wed  [X] Thu  [X] Fri  [X] Sat  [ ] Sun`.
   - Quick Action Presets: `[Everyday]` `[Weekdays Only]` `[Weekends Only]`.
5. **Pricing & Capacity**:
   - Base Fare (`₹120`).
   - Total Bookable Seats (Defaults to vehicle capacity; adjustable for operator buffer).
6. **Assigned Default Driver**: Optional dropdown of verified drivers linked to this operator.

```
+==============================================================================+
|  CREATE RECURRING SCHEDULE TEMPLATE                                      [X] |
+==============================================================================+
|  Configure a continuous schedule rule. Runs will automatically materialize   |
|  every night for the next 14 days.                                           |
|                                                                              |
|  1. Select Vehicle *                      2. Select Route *                  |
|  +------------------------------------+   +--------------------------------+ |
|  | Shibam Coach 01 (AS10D-5047, 32s) v|   | Silchar ISBT -> Sribhumi Town v| |
|  +------------------------------------+   +--------------------------------+ |
|                                                                              |
|  3. Departure Time *                      4. Estimated Duration *            |
|  +------------------------------------+   +--------------------------------+ |
|  | 07 : 30  [ AM v ]                  |   | 135 mins  (Arrival ~09:45 AM)  | |
|  +------------------------------------+   +--------------------------------+ |
|                                                                              |
|  5. Operating Days of Week *                                                 |
|  +-------------------------------------------------------------------------+ |
|  | Quick Presets: [ Everyday ]  [ Weekdays (M-F) ]  [ Weekends (Sa-Su) ]   | |
|  |                                                                         | |
|  |  [X] Mon    [X] Tue    [X] Wed    [X] Thu    [X] Fri    [X] Sat    [ ] Sun  | |
|  +-------------------------------------------------------------------------+ |
|                                                                              |
|  6. Base Fare (₹) *                       7. Bookable Seats *                |
|  +------------------------------------+   +--------------------------------+ |
|  | ₹ 120                              |   | 32 seats (Vehicle Max: 32)     | |
|  +------------------------------------+   +--------------------------------+ |
|                                                                              |
|  8. Default Assigned Driver (Optional)                                       |
|  +-------------------------------------------------------------------------+ |
|  | Raju Das (+91 94350-XXXXX)                                            v | |
|  +-------------------------------------------------------------------------+ |
|                                                                              |
|  [ Cancel ]                                   [ Save & Materialize Runs -> ] |
+==============================================================================+
```

---

### 3.3 Screen 3: Pause Run & Cancellation Modal (with Broadcast Toggle)

**Trigger**: Click `[ Pause Run ]` on any schedule or template row  
**Purpose**: Suspend service with zero data loss, handle existing bookings, and publish notices.

#### Form Controls:
1. **Target Selection**:
   - `(•) Pause This Departure Only (13 Sep 2026, 07:30 AM)`
   - `( ) Pause Entire Template for Date Range (e.g., 13 Sep - 16 Sep 2026)`
   - `( ) Pause Indefinitely (Disable template generation until resumed)`
2. **Standard Disruption Reasons (Barak Valley Context)**:
   - `Road Blockage / Landslide (NH-6 / Meghalaya or NH-37)`
   - `Monsoon Flooding / Waterlogging (Dwarbond / Sonabarighat)`
   - `Vehicle Mechanical Breakdown / Maintenance`
   - `Driver Sickness / Unavailability`
   - `Administrative Bandh / Strike / VIP Movement`
   - `Other (Custom reason)`
3. **Public Announcement Details**:
   - Operational Note (Public explanation shown to passengers).
4. **Disruption Actions**:
   - `[X] Publish Broadcast Alert to Customer Homepage Notice Board`
   - `[X] Notify Booked Passengers (3 Booked) via WhatsApp / SMS`
   - `[X] Automatically trigger full refund credits for booked tickets`
5. **Live Banner Preview Box**: Dynamically renders how the alert banner will appear to passengers.

```
+==============================================================================+
|  PAUSE RUN / SERVICE SUSPENSION                                          [X] |
+==============================================================================+
|  Vehicle: Shibam Coach 01 (AS10D-5047)                                       |
|  Route:   Silchar (ISBT) -> Sribhumi (Town)  •  Departure: 07:30 AM          |
|                                                                              |
|  1. Select Pause Scope:                                                      |
|     (•) Today's Run Only (13 Sep 2026)                                       |
|     ( ) Date Range: From [ 13 Sep 2026 ] To [ 15 Sep 2026 ]                  |
|     ( ) Indefinite (Freeze master template until manual resumption)          |
|                                                                              |
|  2. Reason for Suspension: *                                                 |
|  +-------------------------------------------------------------------------+ |
|  | Landslide / Road Blockage on Highway                                  v | |
|  +-------------------------------------------------------------------------+ |
|                                                                              |
|  3. Public Passenger Notice: *                                               |
|  +-------------------------------------------------------------------------+ |
|  | Heavy rains caused mudslide near Panchgram. NH-37 is closed by PWD.     | |
|  | Service will resume tomorrow morning.                                   | |
|  +-------------------------------------------------------------------------+ |
|                                                                              |
|  4. Notification & Passenger Protection:                                     |
|     [X] Broadcast Alert Banner on Homepage & Search Screen                   |
|     [X] Send WhatsApp notification to all 28 booked passengers               |
|     [X] Mark affected bookings as 'cancelled' with full refund eligibility   |
|                                                                              |
|  LIVE ALERT BANNER PREVIEW:                                                  |
|  +-------------------------------------------------------------------------+ |
|  | ⚠️ SERVICE ALERT: Silchar -> Sribhumi (07:30 AM) is suspended today due | |
|  | to road blockage at Panchgram. Resuming tomorrow morning.               | |
|  +-------------------------------------------------------------------------+ |
|                                                                              |
|  [ Abort / Close ]                            [ Confirm Suspension & Alert ] |
+==============================================================================+
```

---

### 3.4 Screen 4: Customer Homepage Service Disruption Alert Banner

**Route**: `/` (`frontend/src/app/page.tsx` & `HomeClient.tsx`)  
**Target User**: General public and prospective passengers  

#### UX & Interaction Specifications:
1. **Mount Location**: Positioned directly below the primary Navigation bar, immediately above the Hero section and search card.
2. **Visual Hierarchy**:
   - High-contrast warning container (`bg-amber-500/10 border border-amber-500/30 text-amber-950`).
   - Pulsing emergency indicator icon (`warning` / `crisis_alert`).
   - Clear route pill (`Silchar ↔ Sribhumi`).
   - Timestamps (`Valid: Today, 13 Sep`).
3. **Dismissibility & Persistence**:
   - `[ × ]` Close button at right edge.
   - When clicked, stores `dismissed_broadcast_${id}` in browser `localStorage`.
   - Banner remains dismissed until a new `broadcast_id` is published or localStorage is cleared.
4. **Search Form Contextual Alert**:
   - If the passenger searches for a route currently under a broadcast alert, an inline banner appears directly inside the search results container above the schedule cards.

```
+====================================================================================================+
|  [Logo] PATHER SAATHI                  Bookings    Fleet Operator    [ Live Bus Track ]   [ Login ]|
+====================================================================================================+
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | ⚠️ [TRANSIT ADVISORY]  Route: Silchar <-> Sribhumi  •  13 Sep 2026                           |  |
|  | Shibam Coach 01 (07:30 AM) suspended due to heavy rain and highway mudslide at Panchgram.     |  |
|  | Alternative morning services via Badarpur are operating normally.             [Details] [ × ]|  |
|  +----------------------------------------------------------------------------------------------+  |
|                                                                                                    |
|                                   YOUR TRUSTED BUS BOOKING PLATFORM                                |
|                        Connecting Silchar, Sribhumi, and Hailakandi Daily                          |
|                                                                                                    |
|        +----------------------------------------------------------------------------------+        |
|        | SEARCH BUS TICKETS                                                               |        |
|        |                                                                                  |        |
|        | Leaving From:                 Going To:                       Travel Date:       |        |
|        | [ Silchar ISBT               ] [ Sribhumi Town               ] [ 13 Sep 2026    ] |        |
|        |                                                                                  |        |
|        | Passengers: [ 1 Passenger  v ]                               [ Find Buses -> ]   |        |
|        +----------------------------------------------------------------------------------+        |
|                                                                                                    |
+====================================================================================================+
```

---

### 3.5 Screen 5: Public Privacy Policy Page (`/privacy`)

**Route**: `/privacy` (`frontend/src/app/privacy/page.tsx`)  
**Target User**: All users, regulatory auditors, drivers, and passengers  

#### UX & Layout Specifications:
1. **Layout**: Two-column desktop layout (Sticky Table of Contents sidebar on left; full structured legal text on right). Single-column responsive layout on mobile with collapsible accordion TOC.
2. **DPDPA 2023 Compliance Structure**:
   - §1: Introduction & Data Fiduciary Details (Pather Saathi, Sribhumi, Assam).
   - §2: Categories of Data Collected (Passengers, Drivers, Fleet Operators).
   - §3: Driver Live GPS Telemetry Policy (Active trip tracking only, precision coordinates).
   - §4: Mandatory 30-Day Automated Data Purge Schedule (`trip_locations`).
   - §5: Commercial & Tax Record Retention (7 years for ticket bookings and invoices).
   - §6: Data Sharing, Cloud Processors (Supabase, Vercel, Upstash, WhatsApp/Meta).
   - §7: Rights of Data Principals (Right to Access, Correction, Erasure).
   - §8: Grievance Redressal Officer Contact & Escalation Matrix.
3. **Footer Integration**:
   - Replaces placeholder footer on `HomeClient.tsx` with structured links: `Privacy Policy`, `Terms of Service`, `Refund Policy`.
4. **Auth Link Resolution**:
   - `LoginForm.tsx` line 204 updated from `href="#"` to `href="/privacy"`.

```
+====================================================================================================+
|  [Logo] PATHER SAATHI                  Bookings    Fleet Operator    [ Live Bus Track ]   [ Login ]|
+====================================================================================================+
|                                                                                                    |
|  PRIVACY POLICY & DATA PROTECTION DECLARATION                                                      |
|  Effective Date: 13 September 2026  •  Compliant with Digital Personal Data Protection Act (DPDPA) |
|                                                                                                    |
|  +------------------------------+  +-------------------------------------------------------------+ |
|  | TABLE OF CONTENTS            |  | 1. DATA FIDUCIARY IDENTIFICATION                            | |
|  |------------------------------|  | Pather Saathi ("we", "our") operates as a Data Fiduciary     | |
|  | [1. Data Fiduciary Identity] |  | under the Digital Personal Data Protection Act, 2023.        | |
|  | [2. Personal Data Collected] |  | Registered Address: Ward No. 4, Sribhumi, Assam - 788710.    | |
|  | [3. Driver GPS Telemetry   ] |  | Grievance Email: support@pathersaathi.in                    | |
|  | [4. 30-Day Telemetry Purge ] |  |                                                             | |
|  | [5. Passenger Data Handling] |  | 2. PERSONAL DATA WE COLLECT                                 | |
|  | [6. Third-Party Processors ] |  | A. Passengers: Full name, mobile number, booking records.   | |
|  | [7. Your Rights (DPDPA)    ] |  | B. Drivers: High-frequency GPS coordinates (lat/lng, speed, | |
|  | [8. Grievance Officer      ] |  |    heading), phone number, vehicle registration.            | |
|  +------------------------------+  |                                                             | |
|                                    | 3. GPS TELEMETRY & AUTOMATED 30-DAY PURGE                   | |
|                                    | Telemetry is recorded ONLY while a driver operates an       | |
|                                    | active trip. All raw coordinates in `trip_locations` are    | |
|                                    | permanently deleted 30 days after collection via automated  | |
|                                    | database cron jobs.                                         | |
|                                    |                                                             | |
|                                    | [ Download PDF Version ]      [ Contact Grievance Officer ] | |
|                                    +-------------------------------------------------------------+ |
|                                                                                                    |
+====================================================================================================+
|  FOOTER: (C) 2026 Pather Saathi  •  [Privacy Policy]  •  [Terms of Service]  •  [Refund Policy]    |
+====================================================================================================+
```

---

## 4. Detailed State Management for Recurring Bus Runs

### 4.1 Bus Run Lifecycle State Machine

A scheduled transit run moves through a deterministic finite-state machine (FSM). To support owner pause controls, the allowed statuses in `public.schedules` are formally specified:

```
                  +-------------------------------------------------------+
                  |                                                       |
                  v                                                       |
          +---------------+         Driver Starts Trip                    |
          |   SCHEDULED   |------------------------------------+          |
          +---------------+                                    |          |
            |           |                                      |          |
Operator    |           | Operator                             |          |
Pauses Run  |           | Cancels Run                          v          |
            v           v                              +---------------+  |
      +---------+   +-----------+                      |  IN_TRANSIT   |  |
      | PAUSED  |   | CANCELLED |                      +---------------+  |
      +---------+   +-----------+                              |          |
            |                                  Driver Ends Trip|          |
            | Operator Resumes Run                             v          |
            +----------------------------------------> +---------------+  |
                                                       |   COMPLETED   |--+
                                                       +---------------+
```

#### State Transition Matrix:

| Current State | Next State | Triggering Actor | Preconditions / Rules | Side Effects |
|---|---|---|---|---|
| `scheduled` | `in_transit` | Driver or Operator | `driver_start_trip(schedule_id)` executed. | Telemetry recording begins; Realtime channel broadcasts `in_transit`. |
| `in_transit` | `completed` | Driver or Operator | `driver_end_trip(schedule_id)` executed. | Vehicle freed; passenger booking marked completed; wake lock released. |
| `scheduled` | `paused` | Fleet Operator | Operator triggers pause modal. Departure is in future. | Run excluded from customer search; broadcast alert optional. Bookings preserved. |
| `paused` | `scheduled` | Fleet Operator | Operator resumes run. | Run re-enters search results; broadcast alert marked inactive. |
| `scheduled` | `cancelled` | Fleet Operator | Emergency cancellation. | Run marked cancelled; booked passengers notified; refunds unlocked. |
| `in_transit` | `cancelled` | Fleet Operator | Mid-route breakdown / emergency abort. | Trip ended prematurely; passenger rescue or refund workflow activated. |

---

### 4.2 Relational Data Architecture

To support recurring templates and homepage broadcasts without breaking existing foreign key relations, we establish two new tables and augment `public.schedules`.

#### Table 1: `public.recurring_schedule_templates`
Stores master rules for repeating transit runs.

```sql
CREATE TABLE IF NOT EXISTS public.recurring_schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE RESTRICT,
    default_driver_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    departure_time TIME NOT NULL,                        -- e.g. '07:30:00'
    estimated_duration_mins INTEGER NOT NULL,            -- e.g. 135
    days_of_week INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5,6,0}', -- 0=Sun, 1=Mon ... 6=Sat
    base_fare DECIMAL(10, 2) NOT NULL CHECK (base_fare >= 0),
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    is_paused BOOLEAN NOT NULL DEFAULT false,
    pause_reason TEXT,
    paused_until DATE,                                   -- If NULL and is_paused=true, paused indefinitely
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT templates_vehicle_route_dep_uniq UNIQUE (vehicle_id, route_id, departure_time)
);

-- Performance Indexes (Following Supabase Postgres Best Practices)
CREATE INDEX IF NOT EXISTS idx_rec_templates_operator ON public.recurring_schedule_templates(operator_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rec_templates_active ON public.recurring_schedule_templates(is_paused) WHERE deleted_at IS NULL AND is_paused = false;
CREATE INDEX IF NOT EXISTS idx_rec_templates_vehicle ON public.recurring_schedule_templates(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rec_templates_route ON public.recurring_schedule_templates(route_id);
```

#### Table 2: `public.broadcast_notifications`
Stores system-wide and route-specific service disruption alerts.

```sql
CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('service_disruption', 'delay', 'weather', 'road_closure', 'general')),
    severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,                              -- Automatically hidden after expiry
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_broadcasts_active ON public.broadcast_notifications(is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_broadcasts_route ON public.broadcast_notifications(route_id) WHERE is_active = true;
```

#### Table 3 Alterations: `public.schedules`
Linking concrete schedule instances back to parent templates and supporting pause status.

```sql
-- 1. Expand status check constraint to include 'paused'
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_status_check
    CHECK (status IN ('scheduled', 'boarding', 'in_transit', 'completed', 'cancelled', 'paused'));

-- 2. Link to parent template
ALTER TABLE public.schedules 
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.recurring_schedule_templates(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS pause_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_template_id ON public.schedules(template_id);
```

---

### 4.3 Automated Rolling Schedule Materialization via Supabase `pg_cron`

Rather than generating 30 days of data in advance through a client-side loop, schedule generation is delegated to PostgreSQL via a nightly `pg_cron` job.

#### The Rolling Horizon Model:
- **Horizon**: Maintains concrete departure rows for the next **14 days**.
- **Execution**: Runs every night at **01:00 AM UTC (06:30 AM IST)**.
- **Idempotency**: Utilizes `schedules_vehicle_route_time_uniq_active` (`ON CONFLICT (vehicle_id, route_id, departure_time) WHERE deleted_at IS NULL`) so rerunning the function never creates duplicates or overwrites active bookings.

#### Idempotent PostgreSQL Generator Function:
```sql
CREATE OR REPLACE FUNCTION public.generate_rolling_schedules(p_days_ahead INT DEFAULT 14)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_template RECORD;
    v_target_date DATE;
    v_day_of_week INT;
    v_dep_timestamp TIMESTAMPTZ;
    v_arr_timestamp TIMESTAMPTZ;
    v_inserted_count INT := 0;
    v_skipped_count INT := 0;
BEGIN
    -- Iterate over each day in the rolling window
    FOR i IN 0..(p_days_ahead - 1) LOOP
        v_target_date := CURRENT_DATE + i;
        v_day_of_week := EXTRACT(DOW FROM v_target_date); -- 0=Sun, 1=Mon, ..., 6=Sat

        -- Loop through all active recurring templates
        FOR v_template IN 
            SELECT * FROM public.recurring_schedule_templates
            WHERE deleted_at IS NULL
              AND is_paused = false
              AND (paused_until IS NULL OR v_target_date > paused_until)
              AND v_day_of_week = ANY(days_of_week)
        LOOP
            -- Construct timestamps in Asia/Kolkata timezone
            v_dep_timestamp := (v_target_date || ' ' || v_template.departure_time)::TIMESTAMP AT TIME ZONE 'Asia/Kolkata';
            v_arr_timestamp := v_dep_timestamp + (v_template.estimated_duration_mins || ' minutes')::INTERVAL;

            -- Don't generate runs in the past for today's iteration
            IF v_dep_timestamp < now() THEN
                CONTINUE;
            END IF;

            -- Insert if not already present
            INSERT INTO public.schedules (
                template_id,
                vehicle_id,
                route_id,
                driver_id,
                departure_time,
                arrival_time,
                total_seats,
                available_seats,
                base_fare,
                status
            )
            VALUES (
                v_template.id,
                v_template.vehicle_id,
                v_template.route_id,
                v_template.default_driver_id,
                v_dep_timestamp,
                v_arr_timestamp,
                v_template.total_seats,
                v_template.total_seats,
                v_template.base_fare,
                'scheduled'
            )
            ON CONFLICT (vehicle_id, route_id, departure_time) WHERE deleted_at IS NULL
            DO NOTHING;

            IF FOUND THEN
                v_inserted_count := v_inserted_count + 1;
            ELSE
                v_skipped_count := v_skipped_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'inserted_runs', v_inserted_count,
        'skipped_existing', v_skipped_count,
        'horizon_days', p_days_ahead,
        'executed_at', now()
    );
END;
$$;
```

#### Registration with `pg_cron`:
```sql
-- Schedule nightly execution at 01:00 AM UTC (06:30 AM IST)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('generate-rolling-schedules-nightly');
    EXCEPTION WHEN OTHERS THEN END;

    PERFORM cron.schedule(
      'generate-rolling-schedules-nightly',
      '0 1 * * *',
      'SELECT public.generate_rolling_schedules(14)'
    );
  END IF;
END $$;
```

---

### 4.4 Cache Invalidation, SSR Revalidation, & Realtime Broadcast Pipeline

To ensure that schedule pauses and disruption alerts propagate immediately without page reloads:
1. **Next.js Server Action Revalidation**:
   - `revalidatePath('/operator/fleet')` — Updates operator table instantly.
   - `revalidatePath('/')` — Updates homepage search and hero banners.
   - `revalidatePath('/bookings')` — Updates passenger tracking view.
2. **Supabase Realtime Publication**:
   - `broadcast_notifications` is added to `supabase_realtime`:
     ```sql
     ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_notifications;
     ```
3. **Passenger Realtime Subscription Hook (`useBroadcastAlerts`)**:
   - Frontend client subscribes to `postgres_changes` on `broadcast_notifications`.
   - Incoming disruption events display an immediate toast/banner without polling.

---

## 5. DPDPA 2023 Privacy Policy & Compliance Framework

### 5.1 Regulatory Jurisdiction & Scope
Pather Saathi handles personal data and digital telemetry within the territory of India. As such, operations are subject to:
- **Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)**.
- **Information Technology Act, 2000 (Section 43A)** & **SPDI Rules, 2011**.
- **Motor Vehicles Act, 1988 (as amended)** regarding passenger ticket ledgers.

---

### 5.2 Personal Data Inventory & Purpose Limitation

Under Section 4(1) of DPDPA 2023, personal data may only be processed for lawful purposes with consent.

| Category of Data Principal | Data Elements Collected | Primary Processing Purpose | Legal Basis under DPDPA | Storage Location |
|---|---|---|---|---|
| **Passengers** | Full name, mobile number, email, pickup/drop-off stops, booking references | Seat reservation, ticket verification, SMS/WhatsApp service alerts | Section 6 (Consent) | Supabase PostgreSQL (`public.users`, `public.bookings`) |
| **Bus Drivers** | Full name, phone number, vehicle assignment, real-time GPS telemetry (`lat`, `lng`, `speed`, `heading`) | Live proximity tracking for waiting passengers, route safety, delay detection | Section 6 (Consent via Driver Agreement) | Supabase PostgreSQL (`public.trip_locations`) |
| **Fleet Operators** | Business name, operator phone, vehicle registration numbers, route permits | Fleet verification, charter coordination, booking settlement | Section 6 (Contractual necessity) | Supabase PostgreSQL (`public.vehicles`, `public.routes`) |

---

### 5.3 Automated 30-Day Purge Architecture for GPS Telemetry (`trip_locations`)

High-frequency GPS coordinates (`trip_locations`) constitute Sensitive Personal Data. Retaining granular driver location data indefinitely creates unnecessary privacy risks, storage bloat, and regulatory exposure.

#### Policy Rule:
- Live GPS telemetry in `public.trip_locations` is retained **strictly for 30 days** following trip completion to resolve passenger lost-and-found queries or route disputes.
- On day 31, records are permanently deleted via an automated background job.

#### PostgreSQL Purge Function & Weekly Cron:
```sql
CREATE OR REPLACE FUNCTION public.purge_stale_trip_locations()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    DELETE FROM public.trip_locations
    WHERE recorded_at < (now() - INTERVAL '30 days');

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'purged_records', v_deleted_count,
        'cutoff_timestamp', (now() - INTERVAL '30 days'),
        'executed_at', now()
    );
END;
$$;

-- Register weekly Sunday 02:00 AM UTC cron job
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('purge-stale-telemetry-weekly');
    EXCEPTION WHEN OTHERS THEN END;

    PERFORM cron.schedule(
      'purge-stale-telemetry-weekly',
      '0 2 * * 0',
      'SELECT public.purge_stale_trip_locations()'
    );
  END IF;
END $$;
```

---

### 5.4 Passenger Data Retention & Accounting Safeguards
- **Booking Records**: Under the Companies Act and Indian tax regulations, booking transaction summaries (`public.bookings`, payments, passenger names, seat numbers) are retained for **7 financial years**.
- **Data Minimization**: Passwords are never stored in plaintext (managed by Supabase Auth Argon2 / bcrypt hashing). No payment card numbers or bank account passwords touch Pather Saathi servers.

---

### 5.5 Consent Architecture, User Rights, & Grievance Redressal

#### Rights of Data Principals (DPDPA 2023 Chapter III):
1. **Right to Access Information**: Users can view all active and historical bookings via `/bookings`.
2. **Right to Correction & Erasure**: Users can update their profile information via `/profile` or request account deletion by emailing the Grievance Officer.
3. **Right of Grievance Redressal**: Section 10 of DPDPA requires a published Grievance Officer:
   - **Grievance Officer**: Subinoy Nath
   - **Designation**: Data Protection & Operations Lead
   - **Address**: Pather Saathi Transit Hub, Sribhumi, Barak Valley, Assam - 788710
   - **Email**: `support@pathersaathi.in` / `grievance@pathersaathi.in`
   - **Statutory Resolution SLA**: Within 30 days of grievance receipt.

---

### 5.6 Dead Link Remediation in `LoginForm.tsx` & `HomeClient.tsx`

#### 1. Remediation in `frontend/src/app/login/LoginForm.tsx`:
Replace line 204:
```tsx
// Before (Broken Dead Anchors):
By creating an account, you agree to Pather Saathi&apos;s <Link className="text-[#006493] font-semibold underline" href="#">Terms of Service</Link> and <Link className="text-[#006493] font-semibold underline" href="#">Privacy Policy</Link>.

// After (Proper Routing):
By creating an account, you agree to Pather Saathi&apos;s <Link className="text-[#006493] font-semibold underline" href="/terms">Terms of Service</Link> and <Link className="text-[#006493] font-semibold underline" href="/privacy">Privacy Policy</Link>.
```

#### 2. Remediation in `frontend/src/app/HomeClient.tsx` Footer:
Replace lines 608–624 with an expanded footer providing legal links:
```tsx
<footer className="bg-[#f8fafb] text-[#191c1d] px-5 lg:px-10 py-8 md:py-10 border-t border-[#d8dadb]">
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-10">
    <div className="flex flex-col items-center md:items-start">
      <h2 className="text-2xl font-bold mb-4 text-[#00342b]">Contact Us</h2>
      <div className="space-y-3 text-[#3f4945] text-sm font-medium">
        <p className="flex items-center justify-center md:justify-start gap-2"><span className="material-symbols-outlined text-[#006493]">mail</span> support@pathersaathi.in</p>
        <p className="flex items-center justify-center md:justify-start gap-2"><span className="material-symbols-outlined text-[#006493]">call</span> +91 6002089037</p>
        <p className="flex items-center justify-center md:justify-start gap-2"><span className="material-symbols-outlined text-[#006493]">location_on</span> Sribhumi, Barak Valley, Assam</p>
      </div>
    </div>
    <div className="flex flex-col items-center md:items-end gap-3">
      <div className="flex items-center gap-6 text-sm font-semibold text-[#006493]">
        <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        <Link href="/terms" className="hover:underline">Terms of Service</Link>
        <Link href="/operator" className="hover:underline">Operator Portal</Link>
      </div>
      <p className="text-xs text-[#707975]">
        © {new Date().getFullYear()} Pather Saathi. All rights reserved. Barak Valley, Assam.
      </p>
    </div>
  </div>
</footer>
```

---

## 6. Step-by-Step Technical Implementation Guide

### 6.1 Phase 1: PostgreSQL DDL Migrations & Database Functions

Create the following migrations in `supabase/migrations/`:

#### Migration 1: `20260914000001_recurring_schedules_schema.sql`
- Creates `public.recurring_schedule_templates`.
- Expands `public.schedules` status check constraint to include `'paused'`.
- Adds `template_id`, `pause_reason`, `cancelled_at`, and `cancelled_by` to `public.schedules`.
- Configures Row-Level Security (RLS) on templates:
  ```sql
  ALTER TABLE public.recurring_schedule_templates ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Operators manage own recurring templates"
  ON public.recurring_schedule_templates
  FOR ALL TO authenticated
  USING (operator_id = auth.uid())
  WITH CHECK (operator_id = auth.uid());
  ```

#### Migration 2: `20260914000002_broadcast_notifications_schema.sql`
- Creates `public.broadcast_notifications`.
- Configures RLS policies:
  - `Public read active broadcasts`: `FOR SELECT TO anon, authenticated USING (is_active = true AND (expires_at IS NULL OR expires_at > now()))`.
  - `Operators manage own broadcasts`: `FOR ALL TO authenticated USING (operator_id = auth.uid()) WITH CHECK (operator_id = auth.uid())`.
- Adds table to `supabase_realtime` publication.

#### Migration 3: `20260914000003_rolling_schedule_cron.sql`
- Installs `public.generate_rolling_schedules(p_days_ahead INT)`.
- Registers nightly `pg_cron` schedule `0 1 * * *`.

#### Migration 4: `20260914000004_telemetry_purge_cron.sql`
- Installs `public.purge_stale_trip_locations()`.
- Registers weekly `pg_cron` schedule `0 2 * * 0`.

---

### 6.2 Phase 2: Server Actions Implementation (`frontend/src/app/operator/fleet/actions.ts`)

Implement the following server actions:

#### 1. `createRecurringTemplate(formData: FormData)`
- Validates user is an authenticated operator.
- Verifies `vehicle_id` ownership (`vehicles.owner_id = auth.uid()`).
- Parses `days_of_week` array (e.g. `[1, 2, 3, 4, 5]`).
- Inserts into `public.recurring_schedule_templates`.
- Triggers immediate generation for the upcoming 14 days via `generate_rolling_schedules(14)`.
- Revalidates `/operator/fleet`.

#### 2. `pauseScheduleRun(scheduleId: string, options: { reason: string, broadcastHomepage: boolean, alertMessage?: string })`
- Verifies operator owns the schedule through vehicle relation.
- Updates `schedules` row:
  ```typescript
  await supabase
    .from('schedules')
    .update({
      status: 'paused',
      pause_reason: options.reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId)
  ```
- If `broadcastHomepage` is `true`, inserts into `public.broadcast_notifications`:
  ```typescript
  await supabase
    .from('broadcast_notifications')
    .insert({
      operator_id: user.id,
      schedule_id: scheduleId,
      vehicle_id: schedule.vehicle_id,
      route_id: schedule.route_id,
      alert_type: 'service_disruption',
      severity: 'warning',
      title: `Service Suspended: ${schedule.routes.origin.name} → ${schedule.routes.destination.name}`,
      message: options.alertMessage || options.reason,
      starts_at: new Date().toISOString(),
      expires_at: schedule.arrival_time // Expires when run would have finished
    })
  ```
- Revalidates `/operator/fleet` and `/`.

#### 3. `resumeScheduleRun(scheduleId: string)`
- Restores `schedules.status = 'scheduled'`.
- Deactivates associated `broadcast_notifications` (`is_active = false`).
- Revalidates `/operator/fleet` and `/`.

#### 4. `pauseRecurringTemplate(templateId: string, options: { pausedUntil?: string, reason: string, broadcastHomepage: boolean })`
- Sets `is_paused = true`, `pause_reason = options.reason`, `paused_until = options.pausedUntil`.
- Cancels future unbooked schedule instances for that template during the pause window.
- Optionally publishes broadcast alert.
- Revalidates `/operator/fleet` and `/`.

---

### 6.3 Phase 3: Frontend Component Hierarchy & Next.js Client Wire-Up

#### Component Hierarchy:
```
frontend/src/
├── app/
│   ├── page.tsx                           # Fetches active broadcasts + passes to HomeClient
│   ├── HomeClient.tsx                     # Mounts BroadcastAlertBanner in hero
│   ├── privacy/
│   │   └── page.tsx                       # Server-rendered DPDPA Privacy Policy page
│   └── operator/
│       └── fleet/
│           ├── page.tsx                   # Fetches vehicles, routes, templates, schedules
│           └── FleetClient.tsx            # Host client component with tab management
└── components/
    ├── BroadcastAlertBanner.tsx           # Global dismissible notification banner
    ├── operator/
    │   ├── ScheduleTemplatesTable.tsx     # Master recurring templates table
    │   ├── ScheduleInstancesTable.tsx     # Concrete daily runs table with action menus
    │   ├── CreateTemplateModal.tsx        # Add recurring rule dialog
    │   └── PauseRunModal.tsx              # Pause run + broadcast alert modal
    └── Footer.tsx                         # Legal links footer component
```

#### Detailed Component Specifications:

1. **`BroadcastAlertBanner.tsx`**:
   - Client component (`'use client'`).
   - Reads `broadcasts` from props (fetched on SSR) and subscribes to Supabase Realtime for dynamic updates.
   - Maintains local `dismissedAlerts` state synced with `localStorage`.
   - Renders high-visibility amber/glass card with dismiss icon.

2. **`PauseRunModal.tsx`**:
   - Receives target `schedule` or `template`.
   - Offers radio selector: "Pause This Departure", "Pause Template Range", "Cancel Trip".
   - Dropdown of predefined reasons.
   - Text input for custom broadcast message.
   - Checkbox: "Broadcast to Homepage Notice Board".
   - Live visual preview of the banner.
   - Invokes `pauseScheduleRun` server action with Sonner toast feedback.

3. **`frontend/src/app/privacy/page.tsx`**:
   - High-speed server component (`export const dynamic = 'force-static'`).
   - Clean, professional typography with semantic HTML5 (`<article>`, `<section>`, `<nav>`).
   - Includes full statutory text detailed in Section 5.

---

### 6.4 Phase 4: Testing, Verification Matrix, & Rollback Strategy

#### Verification Matrix:

| Test Case | Scenario | Expected Behavior | Verification Command / Check |
|---|---|---|---|
| **TC-01** | Create recurring template (Mon-Sat, 07:30 AM) | Template saved in `recurring_schedule_templates`; next 14 daily runs created in `schedules`. | `SELECT COUNT(*) FROM schedules WHERE template_id = '<id>';` returns 12 or 13 runs. |
| **TC-02** | Operator pauses single run | Schedule status becomes `'paused'`; run no longer returned by `searchSchedules`. | `searchSchedules(...)` omits paused run. |
| **TC-03** | Pause with "Broadcast to Homepage" checked | Record created in `broadcast_notifications`; banner renders on `/`. | Query `broadcast_notifications`; inspect `/` DOM for banner. |
| **TC-04** | Passenger dismisses homepage alert banner | Banner hides; page refresh does not show banner again (stored in `localStorage`). | Refresh browser; banner remains hidden. |
| **TC-05** | Nightly cron execution | Runs materialized for day 14 without duplicating existing runs. | Execute `SELECT public.generate_rolling_schedules(14);` manually. |
| **TC-06** | Telemetry 30-day purge | Rows in `trip_locations` older than 30 days deleted; recent rows preserved. | Execute `SELECT public.purge_stale_trip_locations();`. |
| **TC-07** | Privacy Policy navigation | `LoginForm.tsx` link navigates to `/privacy`; page loads HTTP 200 with TOC. | `curl -I http://localhost:3000/privacy` returns 200 OK. |

#### Rollback Strategy:
Each database migration will have a corresponding teardown script:
```sql
-- Rollback for recurring schedules
DROP FUNCTION IF EXISTS public.generate_rolling_schedules(INT);
DROP TABLE IF EXISTS public.recurring_schedule_templates CASCADE;
ALTER TABLE public.schedules DROP COLUMN IF EXISTS template_id;

-- Rollback for broadcasts
DROP TABLE IF EXISTS public.broadcast_notifications CASCADE;

-- Rollback for cron jobs
SELECT cron.unschedule('generate-rolling-schedules-nightly');
SELECT cron.unschedule('purge-stale-telemetry-weekly');
```

---

## 7. Traceability & Acceptance Verification

This plan directly satisfies every requirement stipulated in **Requirement R3** and the **Original Project Request**:

| Requirement | Addressed in Section | Implementation Mechanism |
|---|---|---|
| **Recurring Daily Schedules** | §3.2, §4.2, §4.3 | `recurring_schedule_templates` table + nightly `pg_cron` rolling generator (14-day window). |
| **Owner Pause Run Controls** | §3.1, §3.3, §4.1, §6.2 | Action menus on schedule rows; `PauseRunModal`; `pauseScheduleRun` server action; `'paused'` status. |
| **Homepage Disruption Broadcasts** | §3.3, §3.4, §4.2, §6.3 | `broadcast_notifications` table; Realtime publication; dismissible banner in `HomeClient.tsx`. |
| **Screen-by-Screen ASCII Wireframes** | §3.1 – §3.5 | Detailed ASCII diagrams covering Operator Fleet, Template Modal, Pause Modal, Homepage Banner, and Privacy Page. |
| **DPDPA 2023 Privacy Policy** | §5.1 – §5.6 | 30-day telemetry purge (`trip_locations`), legal disclosures, Grievance Officer details, `/privacy` page. |
| **Fix Broken Auth & Footer Links** | §2.4, §5.6 | Resolves `LoginForm.tsx:204` dead link `href="#"` and integrates legal links in `HomeClient.tsx` footer. |
| **Step-by-Step Technical Guide** | §6.1 – §6.4 | Complete DDL migrations, server actions, component hierarchy, test matrix, and rollback plans. |

---
*End of Architectural Plan — Pather Saathi Fleet Engineering Team*
