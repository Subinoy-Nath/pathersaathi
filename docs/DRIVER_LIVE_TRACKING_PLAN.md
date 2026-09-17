# Technical & UX Specification: Driver Module & Live Bus Tracking Plan

**Document Reference**: `DOC-PLN-R2-2026-09`  
**Project**: Pather Saathi (Barak Valley Regional Transit & Intercity Charter Platform)  
**Target Milestone**: Requirement R2 (Driver Live Tracking Architecture & Low Tech-Literacy UX Plan)  
**Authors**: Teamwork Architecture & Planning Working Group  
**Date**: September 2026  
**Status**: Authoritative Architectural Plan (Ready for Execution)  
**Stack Alignment**: Next.js 16.2.6 (App Router), React 19.2.4, Supabase (Postgres 14.5, Realtime, RLS, Auth), Tailwind CSS v4, Leaflet.js  

---

## 1. Executive Summary & Operating Context

Pather Saathi is a regional public transit scheduling and private bus charter platform serving the **Barak Valley** region of southern Assam (Cachar, Sribhumi/Karimganj, and Hailakandi districts). A central operational bottleneck in regional transit is the lack of passenger visibility into bus departures, en-route delays, and actual arrival times, combined with bus drivers who have minimal digital literacy, operate budget Android devices under harsh road conditions, and navigate challenging cellular dead zones along national highways (NH-37, NH-6) and rural tea-estate corridors.

While database migration `20260902000001_driver_and_live_tracking.sql` successfully established the relational foundation (`public.trip_locations`, role `'driver'`, `driver_start_trip`, `driver_end_trip`, and Supabase Realtime publication), **zero frontend implementation exists today**.

This document provides the authoritative, end-to-end UX design and technical implementation blueprint for:
1. A **low tech-literacy, zero-friction Driver Module** (`/driver`) engineered for zero mid-drive interaction, bright sunlight readability, massive touch targets (72–80px), bilingual Bengali/English visual and audio cues, Screen Wake Lock enforcement, and an offline GPS ring-buffer.
2. A **real-time Passenger Tracking Map** embedded in `/bookings` powered by Leaflet, OpenStreetMap, smooth marker interpolation, and Supabase Realtime WebSocket subscriptions.
3. A **step-by-step technical implementation guide** containing production-grade React 19 hooks, client-side caching algorithms, jitter filters, and battery/thermal optimizations.

```
+---------------------------------------------------------------------------------------------------+
|                                  SYSTEM ARCHITECTURE OVERVIEW                                     |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ DRIVER MOBILE DEVICE ]                                  [ SUPABASE CLOUD BACKEND ]             |
|  (Chrome Android / PWA)                                    (Postgres + Realtime Engine)           |
|                                                                                                   |
|  +---------------------------+                             +-----------------------------------+  |
|  |   HTML5 Geolocation API   |                             | PostgreSQL 14.5                   |  |
|  | (watchPosition 8-10s ping)|                             | - public.schedules (status)       |  |
|  +-------------+-------------+                             | - public.trip_locations (telemetry|  |
|                |                                           +-----------------+-----------------+  |
|                v                                                             |                    |
|  +---------------------------+                             +-----------------v-----------------+  |
|  | Jitter & Speed Filter     |                             | Supabase Realtime Engine          |  |
|  | (Haversine delta > 15m)   |                             | (Postgres WAL -> WebSocket pub)   |  |
|  +-------------+-------------+                             +-----------------+-----------------+  |
|                |                                                             |                    |
|       [ Network Online? ]                                                    |                    |
|        /               \                                                     |                    |
|     (Yes)             (No)                                                   |                    |
|      /                   \                                                   |                    |
|     v                     v                                                  |                    |
|  +-------------+   +-------------------+                                     |                    |
|  | Supabase REST|   | IndexedDB / Local |                                     |                    |
|  | INSERT batch|   | Ring-Buffer (50)  |                                     |                    |
|  +------+------+   +---------+---------+                                     |                    |
|         |                    |                                               |                    |
|         |          (When reconnected)                                        |                    |
|         |                    |                                               |                    |
|         +----------->--------+                                               |                    |
|                     |                                                        |                    |
|                     v                                                        |                    |
|          [ HTTP POST / REST ] ----------------------------------------------->                    |
|                                                                              |                    |
|                                                                              v                    |
|  [ PASSENGER MOBILE / DESKTOP ]                                              |                    |
|  +---------------------------------------------------------------------------+-----------------+  |
|  | /bookings/track/[scheduleId]                                                                |  |
|  | - Leaflet Map (SSR Disabled Dynamic Import)                                                 |  |
|  | - useLiveBusTracking Hook (Subscribes to trip_locations where schedule_id = :id)            |  |
|  | - Smooth Lerp Marker Interpolation (Heading arrow + pulsing radar ring)                    |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Barak Valley Operating Realities & Driver Demographics

Designing for transit drivers in Barak Valley requires addressing physical, digital, and infrastructural realities:

| Operational Dimension | Reality on the Ground | Engineered UX & Technical Response |
|---|---|---|
| **Driver Literacy & Language** | Most bus drivers in Silchar, Hailakandi, and Karimganj are aged 35–58 with primary education. Primary spoken languages are **Sylheti** and **Bengali**, with conversational Hindi; English reading capability is limited to numerals and common vehicle signage. | Every UI element features dual-language microcopy (`Bengali` primary, `English` secondary). Critical status changes trigger distinctive Web Audio tones and synthesized speech. |
| **Cab Environment & Phone Mounts** | Phones are mounted on rattling windshield suction cups or dashboard clips directly exposed to tropical Assam heat, blinding ambient glare, and diesel engine vibrations. | High-contrast Dark Theme (`#001712` background with `#00FF66` neon text) visible in direct sunlight from 1.5 meters. Enormous buttons (80px height) spanning full phone width. |
| **Driver Attention & Safety** | Drivers are operating 32–52 seat heavy commercial vehicles on narrow two-lane roads (e.g. Silchar–Kalain–Meghalaya border or Silchar–Hailakandi state highway). Looking at or tapping a phone while moving is illegal and hazardous. | **Strict Zero Mid-Drive Interaction**: Once the trip starts, the app requires 0 taps until arrival. The screen acts purely as a passive Head-Up Display (HUD). |
| **Accidental Touches** | Potholes and sudden braking frequently cause accidental screen taps. | Single-tap trip termination is strictly banned. Finishing a trip requires a **2-second continuous press-and-hold** with visual ring progress. |
| **Cellular Infrastructure** | Highway stretches through Panchgram, Badarpur Ghat, and hilly borders experience frequent 4G drops, switching to 2G EDGE or complete dead zones for 5–20 minutes. | An in-browser **Circular Ring-Buffer** (capacity 50 pings) caches telemetry in `IndexedDB`. When signal restores, queued records replay to Supabase in an atomic batch. |
| **Device Hardware Constraints** | Drivers typically use budget Android devices (e.g., Redmi, Realme, Samsung Galaxy M-series) with aggressive OS battery management that puts idle browser tabs to sleep after 30 seconds. | Continuous **Screen Wake Lock API** (`navigator.wakeLock.request('screen')`) keeps the CPU and display active. Automatic re-acquisition triggers if interrupted by an incoming phone call. |

---

## 3. Low Tech-Literacy Driver UX Principles

To guarantee that any regional driver can successfully operate the system on Day 1 without formal training, the interface enforces five foundational principles:

### Principle 1: The "Two-Tap Rule" (Zero Mid-Drive Interaction)
The entire driver lifecycle consists of exactly two intentional actions:
1. **Tap 1 (Start of Journey)**: Tap the massive green button `[ যাত্রা শুরু করুন / START TRIP ]`.
2. **Drive Phase**: Place phone in mount. **Never touch the screen again**. The HUD broadcasts live location, monitors GPS health, and records buffer points autonomously.
3. **Tap 2 (Destination Arrival)**: Press and hold the red button `[ যাত্রা শেষ করুন / END TRIP ]` for 2 seconds.

### Principle 2: Extreme Sunlight Legibility & Color Semantics
- **Background**: Deep Obsidian Green (`#001712`) eliminating glare and saving battery on OLED panels.
- **Card Surfaces**: High-contrast Emerald Tint (`#002B22`) with `#00FF66` active border glow.
- **Primary Action (Start)**: Neon Emerald Green (`#00E676`), black bold text, 80px touch target.
- **Secondary Action (End)**: High-Visibility Crimson (`#FF3B30`), white bold text, 80px touch target.
- **Status Amber**: Vibrant Warning Gold (`#FFB300`) for offline buffering or GPS signal degradation.
- **Typography**: Oversized sans-serif font (minimum 20px for labels, 36–48px for live metrics like speed and passenger count) with Bengali script rendered in unicode fonts (`Noto Sans Bengali` / system Bengali).

### Principle 3: Multi-Sensory Audio & Haptic Feedback
Visual indicators are insufficient when a driver's eyes must remain on the road. The module integrates Web Audio API synthesized frequencies and device vibration (`navigator.vibrate`):
- **Trip Start Tone**: Two-tone ascending chime (440Hz -> 880Hz, 150ms each) + 100ms vibration.
- **GPS Lost Alert**: Low-frequency warning pulse (220Hz, 3 repeating pulses) + double vibration (`[100, 50, 100]ms`).
- **Trip Completed Chime**: Three-tone harmonic celebration chime (523Hz -> 659Hz -> 784Hz) + long vibration (250ms).

### Principle 4: Guarded Hold-to-Confirm Actions
To eliminate accidental cancellations caused by dashboard vibration or unintended touches, destructive or terminal actions (such as ending a trip) utilize an animated SVG circular progress button requiring a **2000ms continuous press**. If released prior to 2 seconds, the action cancels without penalty.

### Principle 5: Ambient Status Heartbeat (The "Radar Pulse")
Drivers need passive reassurance that the system is transmitting. A prominent, glowing green radar icon pulses rhythmically every 3 seconds alongside a live timestamp countdown ("Synced 4s ago / ক্লাউড সংযুক্ত"). If a transmission fails, the pulse changes immediately to amber ("Buffering Locally / অফলাইনে সংরক্ষিত").

---

## 4. Screen-by-Screen UX Flows & ASCII Wireframes (Driver Module)

The Driver Module is organized under the isolated route group `/driver`.

### 4.1 Route Hierarchy & Page Architecture

```
frontend/src/app/driver/
├── login/
│   └── page.tsx           # Ultra-simple phone + 4-digit PIN or WhatsApp Magic Link
├── layout.tsx             # Standalone Driver Layout (no customer Navbar, wake-lock manager)
├── page.tsx               # Driver Cockpit (Assigned schedule overview & Start button)
├── trip/
│   └── [scheduleId]/
│       └── page.tsx       # Live Head-Up Display (HUD) with GPS transmitter & Wake Lock
└── summary/
    └── [scheduleId]/
        └── page.tsx       # Trip completion report & odometer summary
```

---

### 4.2 Screen 1: Driver Fast Authentication Screen (`/driver/login`)

**Purpose**: Provide friction-free entry for drivers without requiring password recall, email addresses, or CAPTCHAs. Drivers authenticate via a registered mobile number + 4-digit PIN or a direct WhatsApp One-Tap Magic Link sent by the fleet operator.

```
+-------------------------------------------------------------+
| [LANG: বাংলা | EN]                           [Help: 📞 Call]|
+-------------------------------------------------------------+
|                                                             |
|                      পথের সাথী ড্রাইভার                     |
|                    PATHER SAATHI DRIVER                     |
|                                                             |
|  +-------------------------------------------------------+  |
|  | মোবাইল নম্বর লিখুন                                    |  |
|  | ENTER MOBILE NUMBER                                   |  |
|  |                                                       |  |
|  |  [ +91 |  9 8 7 6 5  4 3 2 1 0                      ] |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  | ৪ সংখ্যার পিন (4-DIGIT PIN)                           |  |
|  |                                                       |  |
|  |             [ • ]   [ • ]   [ • ]   [ • ]             |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +=======================================================+  |
|  |                                                       |  |
|  |          লগইন করুন  /  LOGIN TO CABIN                 |  |
|  |          (Height: 76px | Touch Target)                |  |
|  |                                                       |  |
|  +=======================================================+  |
|                                                             |
|  - - - - - - - - - - - - - বা / OR - - - - - - - - - - - -  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  [WhatsApp Icon]  হোয়াটসঅ্যাপে ওটিপি পাঠান           |  |
|  |                   Send One-Tap Link to WhatsApp       |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  Operator Helpline: +91 94350 12345 (Silchar HQ)            |
+-------------------------------------------------------------+
```

**Key Features**:
- Touch targets: Keypad and login button > 76px.
- Dual-language labels throughout.
- If pre-authenticated via WhatsApp magic link (`/driver/login?token=...`), the screen auto-redirects directly to `/driver` in under 1 second.

---

### 4.3 Screen 2: Driver Cockpit & Assigned Trip Screen (`/driver`)

**Purpose**: Present today's scheduled run clearly to the driver. The driver verifies the bus registration number and destination, verifies GPS status, and launches the trip.

```
+-------------------------------------------------------------+
| [=] ড্রাইভার: রহিম আহমেদ (AS-11)              [📶 4G Online] |
+-------------------------------------------------------------+
|                                                             |
|  আজকের নির্ধারিত ট্রিপ                                      |
|  TODAY'S ASSIGNED RUN                                       |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  গাড়ি / BUS: শিবম কোচ ০১ (Shibam Coach 01)            |  |
|  |  নম্বর / REG: AS-10-DC-5047 (32-Seater Superfast)     |  |
|  |                                                       |  |
|  |  রুট / ROUTE:                                         |  |
|  |  শিলচর বাস টার্মিনাস  ───>  শ্রীভূমি (করিমগঞ্জ)       |  |
|  |  Silchar ISBT             Sribhumi Central            |  |
|  |                                                       |  |
|  |  ছাড়ার সময় / DEPARTURE: ০৭:৩০ AM (In 15 Mins)        |  |
|  |  যাত্রী সংখ্যা / PASSENGERS: ২৮ জন বুকিং (28 Booked)   |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  | জিপিএস প্রস্তুতি / GPS CHECK:                         |  |
|  | [ ✔ ] অবস্থান সনাক্তকরণ প্রস্তুত (GPS Signal Ready)    |  |
|  | [ ✔ ] স্ক্রিন লক নিয়ন্ত্রণ সক্ষম (Wake Lock Ready)    |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +=======================================================+  |
|  |                                                       |  |
|  |     [ ▶ ]  যাত্রা শুরু করুন                           |  |
|  |            START TRIP                                 |  |
|  |                                                       |  |
|  |     (Height: 80px | Vibrant Emerald Green #00E676)    |  |
|  +=======================================================+  |
|                                                             |
|  ⚠️ গাড়ি চালানোর সময় ফোনে হাত দেবেন না                     |
|  Keep phone mounted on dashboard during transit.            |
+-------------------------------------------------------------+
```

**Interaction Details**:
- When the driver taps `[ ▶ ] START TRIP`:
  1. Calls Supabase RPC `driver_start_trip(p_schedule_id)`.
  2. Acquires Screen Wake Lock (`navigator.wakeLock.request('screen')`).
  3. Fires trip start sound chime and vibration.
  4. Starts continuous geolocation watch (`useDriverLocation`).
  5. Navigates to `/driver/trip/[scheduleId]`.

---

### 4.4 Screen 3: Active Live Driving Head-Up Display (HUD) (`/driver/trip/[scheduleId]`)

**Purpose**: High-contrast, sunlight-visible passive dashboard during driving. Zero user input required while in motion.

```
+-------------------------------------------------------------+
| ((●)) জিপিএস লাইভ চলছে / GPS TRANSMITTING      [🔋 84% ☀️]  |
+-------------------------------------------------------------+
|                                                             |
|  +-------------------------------------------------------+  |
|  |  বর্তমান গতি / SPEED       পরবর্তী স্টপ / NEXT STOP     |  |
|  |                                                       |  |
|  |     ৪৪                    বদরপুর ঘাট                  |  |
|  |    KM/H                   Badarpur Ghat (12 km)       |  |
|  |                                                       |  |
|  |  স্যাটেলাইট সংকেত: চমৎকার   সার্ভার সিঙ্ক: ৩ সেকেন্ড আগে |  |
|  |  Accuracy: ± 4 meters     Synced: 3s ago              |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  গন্তব্য / DESTINATION: করিমগঞ্জ / শ্রীভূমি             |  |
|  |  বুকিং যাত্রী / PASSENGERS ON BOARD: ২৮ / ৩২           |  |
|  |  দূরত্ব বাকি / REMAINING: ৩৪ কিমি (Est. 45 Mins)       |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  [ ☕ ১৫ মিনিট বিরতি ]    [ ⚠️ ট্রাফিক জ্যাম রিপোর্ট ]  |  |
|  |  15m Quick Rest Stop      Heavy Traffic Delay         |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +=======================================================+  |
|  |                                                       |  |
|  |    [ ■ ]  যাত্রা শেষ করতে ২ সেকেন্ড চেপে ধরে রাখুন    |  |
|  |           HOLD 2 SECONDS TO END TRIP                  |  |
|  |                                                       |  |
|  |    (Height: 80px | Crimson #FF3B30 | Hold-to-Confirm) |  |
|  +=======================================================+  |
|                                                             |
|  🔒 স্ক্রিন লক চালু আছে • আলো বন্ধ হবে না (Wake Lock Active)|
+-------------------------------------------------------------+
```

**Key Mechanics**:
- **Speedometer**: Enormous 44px numbers displaying real-time speed in km/h derived from GPS coordinates.
- **Passive Reassurance**: "Synced: 3s ago" pulses in synchronized green.
- **Hold-to-End**: Prevents accidental termination. An animated ring fills over 2000ms. On complete fill, calls `driver_end_trip(schedule_id)`.

---

### 4.5 Screen 4: Offline Reconnection & Dead-Zone HUD (Automatic Fallback)

**Purpose**: When traveling through tea garden valleys or hill tunnels with lost cellular coverage, the HUD seamlessly switches to offline mode without interrupting telemetry collection.

```
+-------------------------------------------------------------+
| ⚠️ অফলাইন মোড সক্রিয় / OFFLINE BUFFERING     [❌ NO 4G]    |
+-------------------------------------------------------------+
|                                                             |
|  +-------------------------------------------------------+  |
|  |  ! নেটওয়ার্ক সংযোগ বিচ্ছিন্ন / NO INTERNET              |  |
|  |                                                       |  |
|  |  চিন্তা নেই! আপনার জিপিএস রেকর্ড হচ্ছে।               |  |
|  |  নেটওয়ার্ক ফিরলে স্বয়ংক্রিয়ভাবে জমা হবে।              |  |
|  |                                                       |  |
|  |  Don't worry! GPS data is safely saving to phone.    |  |
|  |  Will automatically sync when network restores.       |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  জমা হওয়া অবস্থান / BUFFERED PINGS:                   |  |
|  |                                                       |  |
|  |         [ ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░ ]  ১৮ / ৫০             |  |
|  |         18 points saved in local ring-buffer          |  |
|  |                                                       |  |
|  |  GPS Status: স্যাটেলাইট সক্রিয় (Satellite GPS Active)|  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +=======================================================+  |
|  |                                                       |  |
|  |    [ ■ ]  যাত্রা শেষ করতে ২ সেকেন্ড চেপে ধরে রাখুন    |  |
|  |           HOLD 2 SECONDS TO END TRIP                  |  |
|  |                                                       |  |
|  +=======================================================+  |
+-------------------------------------------------------------+
```

**Behavior**:
- The screen border turns **Electric Amber** (`#FFB300`).
- No modal pops up; no user interaction is required.
- Points are pushed into an in-memory & `IndexedDB` ring buffer.
- As soon as cellular network returns, the buffer flushes silently in the background and returns to Screen 3.

---

### 4.6 Screen 5: Trip Completion & Handover Summary (`/driver/summary/[scheduleId]`)

**Purpose**: Provide closure when the driver arrives at the destination terminus. Shows journey statistics and releases device wake lock.

```
+-------------------------------------------------------------+
|                  পথের সাথী • ট্রিপ রিপোর্ট                  |
+-------------------------------------------------------------+
|                                                             |
|                        [  ✔  ]                              |
|                  যাত্রা সফলভাবে সম্পন্ন!                    |
|                 TRIP COMPLETED SUCCESSFULLY                 |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  গাড়ি: শিবম কোচ ০১ (AS-10-DC-5047)                    |  |
|  |  রুট: শিলচর ISBT ──> শ্রীভূমি সেন্ট্রাল                 |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  যাত্রার পরিসংখ্যান / TRIP METRICS:                    |  |
|  |                                                       |  |
|  |  মোট সময় / Duration:           ১ ঘণ্টা ৪৫ মিনিট      |  |
|  |  মোট দূরত্ব / Distance:          ৫২.৪ কিমি             |  |
|  |  গড় গতি / Average Speed:       ৩০ কিমি/ঘণ্টা         |  |
|  |  জিপিএস সিঙ্ক / GPS Records:    ৩৮২ টি রেকর্ড প্রেরিত  |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +=======================================================+  |
|  |                                                       |  |
|  |     [ 🏠 ]  মূল ড্যাশবোর্ডে ফিরে যান                  |  |
|  |             RETURN TO CABIN HOME                      |  |
|  |             (Height: 76px | Forest Green)             |  |
|  |                                                       |  |
|  +=======================================================+  |
|                                                             |
|  🔒 স্ক্রিন লক মুক্তি দেওয়া হয়েছে (Wake Lock Released)      |
+-------------------------------------------------------------+
```

---

## 5. Screen-by-Screen UX Flow & ASCII Wireframe (Passenger Tracking Map)

The passenger tracking map is accessible directly from the customer booking ledger (`/bookings`) whenever a booking is in `'approved'` status and the associated schedule is `'in_transit'` or `'scheduled'`.

### 5.1 Route & Entry Point
- **URL**: `/bookings/track/[scheduleId]` or an expandable slide-over drawer within `/bookings`.
- **Authorization**: Protected by RLS policy `"Passengers can view telemetry for booked trip"`. Passengers without an approved booking for that schedule receive HTTP 403.

### 5.2 Passenger Live Tracking Map Screen Wireframe

```
+-------------------------------------------------------------+
| [ < Back to Bookings]    লাইভ বাস ট্র্যাকিং   [🔄 Live Pulse]|
+-------------------------------------------------------------+
|                                                             |
|  +-------------------------------------------------------+  |
|  |  শিবম কোচ ০১ (AS-10-DC-5047)        [ ● ইন-ট্রানজিট ] |  |
|  |  Silchar ISBT ──> Sribhumi Central    IN TRANSIT      |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +=======================================================+  |
|  |                                                       |  |
|  |                   LEAFLET MAP VIEW                    |  |
|  |                                                       |  |
|  |    [Silchar ISBT]                                     |  |
|  |         \                                             |  |
|  |          \===== (Completed Route - Blue Line)         |  |
|  |                 \                                     |  |
|  |                 [ 🚌 BUS MARKER (Heading 240°) ]      |  |
|  |                 (( Pulse Animation Ring ))            |  |
|  |                     - - - - (Remaining - Grey Line)   |  |
|  |                            \                          |  |
|  |                        [ 📍 YOUR PICKUP: Badarpur ]   |  |
|  |                              \                        |  |
|  |                             [Sribhumi Central]        |  |
|  |                                                       |  |
|  |  [ + ] Zoom In                       [ ⌖ Recenter Bus]|  |
|  |  [ - ] Zoom Out                                       |  |
|  +=======================================================+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  বোর্ডিং তথ্যাবলী / BOARDING & ETA HUD:                 |  |
|  |                                                       |  |
|  |  পৌঁছানোর আনুমানিক সময় / ETA:  ১৫ মিনিট (In 15 Mins)  |  |
|  |  দূরত্ব / Distance Remaining:   ৬.২ কিমি (6.2 km)      |  |
|  |  বর্তমান গতি / Speed:           ৩৮ কিমি/ঘণ্টা         |  |
|  |  শেষ আপডেট / Last Updated:      ৪ সেকেন্ড আগে (Live)   |  |
|  +-------------------------------------------------------+  |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  ড্রাইভার: রহিম আহমেদ                [ 📞 কল করুন ]    |  |
|  |  বুকিং রেফারেন্স: PS-2026-9041       [ 💬 WhatsApp ]   |  |
|  +-------------------------------------------------------+  |
+-------------------------------------------------------------+
```

### 5.3 Map Visual Components & Behaviors
1. **Vehicle Marker**: Custom SVG bus icon rotating dynamically according to the `heading` field (0°–360°). Surrounded by a glowing CSS radar pulse (`@keyframes pulse`).
2. **Route Polyline**:
   - Traveled segment: Solid Teal `#00affe` (stroke width 5px).
   - Upcoming segment: Dashed Forest Green `#004d40` (stroke width 4px).
3. **Passenger Pickup Point**: A distinctive golden pin marker showing where the passenger will board.
4. **Heartbeat Reassurance**: The "Last Updated" ticker increments in seconds (`1s ago`, `2s ago`). If no ping arrives for >45 seconds, the status badge transforms from green to amber: `[ ⚠️ GPS SIGNAL PAUSED ]`.

---

## 6. Step-by-Step Technical Implementation Guide

This section specifies the exact technical architecture, library configurations, custom hooks, database integrations, and performance optimizations required to execute Requirement R2.

---

### Step 1: Map Engine Selection & Dynamic SSR-Disabled Setup

#### 1.1 Architecture & Evaluation
- **Selected Library**: `leaflet` (v1.9.4) paired with `@types/leaflet`.
- **Rationale**:
  1. **Zero Cost & No API Keys**: Google Maps and Mapbox charge per tile load or require active billing credit cards. Leaflet with OpenStreetMap or CartoDB Positron tiles is 100% free with no quota limits.
  2. **Minimal Bundle Weight**: Leaflet is ~39 KB gzipped compared to Mapbox GL JS (>240 KB gzipped) and MapLibre (~200 KB). This is critical for 3G mobile networks in Barak Valley.
  3. **Next.js 16 Compatibility**: Leaflet relies directly on browser `window` and `document` APIs. It must be dynamically loaded with `ssr: false` to prevent Next.js server pre-rendering crashes.

#### 1.2 Package Dependencies
To be added to `frontend/package.json`:
```bash
npm install leaflet
npm install -D @types/leaflet
```

#### 1.3 Dynamic Client Wrapper Implementation Pattern
Create `frontend/src/components/map/LiveBusMap.tsx`:

```tsx
'use client'

import dynamic from 'next/dynamic'
import React from 'react'

interface LiveBusMapProps {
  scheduleId: string
  vehicleRegistration: string
  routeOrigin: { name: string; lat: number; lng: number }
  routeDestination: { name: string; lat: number; lng: number }
  passengerPickup?: { name: string; lat: number; lng: number }
}

// Dynamically import Leaflet with SSR completely disabled
const DynamicLeafletMap = dynamic(
  () => import('./LeafletMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[450px] bg-[#001712] rounded-2xl flex flex-col items-center justify-center text-white/70 animate-pulse">
        <span className="material-symbols-outlined text-4xl text-[#00E676] animate-spin mb-2">
          progress_activity
        </span>
        <p className="font-medium text-sm">Loading Live Route Map / মানচিত্র লোড হচ্ছে...</p>
      </div>
    )
  }
)

export default function LiveBusMap(props: LiveBusMapProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#004d40]/20 shadow-lg">
      <DynamicLeafletMap {...props} />
    </div>
  )
}
```

#### 1.4 Leaflet CSS Ingestion
In `frontend/src/app/globals.css` or the tracking page layout:
```css
@import "leaflet/dist/leaflet.css";

/* Custom pulse animation for live bus marker */
@keyframes bus-radar {
  0% {
    transform: scale(0.9);
    opacity: 0.9;
  }
  70% {
    transform: scale(2.2);
    opacity: 0;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.bus-pulse-ring {
  position: absolute;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 230, 118, 0.4);
  animation: bus-radar 2s infinite ease-out;
}
```

---

### Step 2: Driver Geolocation Watcher Hook (`useDriverLocation`)

#### 2.1 Hook Responsibilities
1. Stream position updates via HTML5 `navigator.geolocation.watchPosition`.
2. Apply **Haversine Distance & Jitter Filtering** to reject noisy stationary GPS wobble.
3. Reject low-accuracy readings (e.g. cellular tower triangulation with `accuracy > 35m`).
4. Throttle backend transmission to an optimal cadence of **8 to 10 seconds**.
5. Automatically route failed transmissions into the offline ring-buffer.

#### 2.2 Complete TypeScript Implementation Architecture
Create `frontend/src/hooks/useDriverLocation.ts`:

```typescript
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { offlineBuffer } from '@/utils/offlineGpsBuffer'

interface DriverLocationState {
  isTracking: boolean
  latitude: number | null
  longitude: number | null
  speed: number | null         // in km/h
  heading: number | null       // in degrees
  accuracy: number | null      // in meters
  lastSyncedAt: Date | null
  error: string | null
  isOnline: boolean
  bufferedCount: number
}

interface UseDriverLocationOptions {
  scheduleId: string
  vehicleId: string
  driverId: string
  minDistanceMeters?: number   // default: 15m
  throttleMs?: number          // default: 8000ms (8s)
  maxAccuracyThreshold?: number // default: 35m
}

// Calculate Haversine distance in meters between two lat/lng pairs
function calculateHaversineDistance(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371e3 // Earth radius in meters
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function useDriverLocation({
  scheduleId,
  vehicleId,
  driverId,
  minDistanceMeters = 15,
  throttleMs = 8000,
  maxAccuracyThreshold = 35
}: UseDriverLocationOptions) {
  const [state, setState] = useState<DriverLocationState>({
    isTracking: false,
    latitude: null,
    longitude: null,
    speed: null,
    heading: null,
    accuracy: null,
    lastSyncedAt: null,
    error: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    bufferedCount: 0
  })

  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastTransmitTimeRef = useRef<number>(0)
  const watchIdRef = useRef<number | null>(null)
  const supabase = createClient()

  // Transmit location to Supabase or push to offline buffer
  const transmitLocation = useCallback(async (payload: {
    schedule_id: string
    vehicle_id: string
    driver_id: string
    latitude: number
    longitude: number
    speed: number | null
    heading: number | null
    accuracy: number | null
    recorded_at: string
  }) => {
    if (!navigator.onLine) {
      await offlineBuffer.push(payload)
      const count = await offlineBuffer.count()
      setState(prev => ({ ...prev, bufferedCount: count, isOnline: false }))
      return
    }

    try {
      const { error } = await supabase
        .from('trip_locations')
        .insert(payload)

      if (error) throw error

      lastTransmitTimeRef.current = Date.now()
      setState(prev => ({
        ...prev,
        lastSyncedAt: new Date(),
        error: null,
        isOnline: true
      }))
    } catch (err: unknown) {
      console.warn('Network upload failed, buffering locally:', err)
      await offlineBuffer.push(payload)
      const count = await offlineBuffer.count()
      setState(prev => ({ ...prev, bufferedCount: count, isOnline: false }))
    }
  }, [supabase])

  // Process raw position from Geolocation API
  const handlePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, speed, heading, accuracy } = position.coords
    const now = Date.now()

    // 1. Accuracy Filter: Reject imprecise cellular tower triangulations
    if (accuracy && accuracy > maxAccuracyThreshold) {
      console.log(`Rejected ping: low accuracy (${accuracy.toFixed(1)}m > ${maxAccuracyThreshold}m)`)
      return
    }

    // Convert speed from m/s to km/h (fallback to 0 if null/negative)
    const speedKmh = speed && speed > 0 ? Math.round(speed * 3.6) : 0

    // 2. Distance Filter: Ignore stationary jitter if vehicle is stopped
    let shouldTransmit = false
    if (!lastCoordsRef.current) {
      shouldTransmit = true
    } else {
      const distanceMoved = calculateHaversineDistance(
        lastCoordsRef.current.lat,
        lastCoordsRef.current.lng,
        latitude,
        longitude
      )
      const timeElapsed = now - lastTransmitTimeRef.current

      // Transmit if moved > 15m OR if 8s elapsed while vehicle has speed > 5 km/h
      if (distanceMoved >= minDistanceMeters && timeElapsed >= throttleMs) {
        shouldTransmit = true
      } else if (timeElapsed >= (throttleMs * 2)) {
        // Heartbeat ping every 16s even if stationary at a stop
        shouldTransmit = true
      }
    }

    // Update local HUD state immediately for real-time driver feedback
    setState(prev => ({
      ...prev,
      latitude,
      longitude,
      speed: speedKmh,
      heading: heading || prev.heading,
      accuracy,
      error: null
    }))

    if (shouldTransmit) {
      lastCoordsRef.current = { lat: latitude, lng: longitude }
      transmitLocation({
        schedule_id: scheduleId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        latitude,
        longitude,
        speed: speedKmh,
        heading: heading || null,
        accuracy: accuracy || null,
        recorded_at: new Date().toISOString()
      })
    }
  }, [maxAccuracyThreshold, minDistanceMeters, throttleMs, scheduleId, vehicleId, driverId, transmitLocation])

  const handleError = useCallback((error: GeolocationPositionError) => {
    let msg = 'GPS error occurred'
    switch (error.code) {
      case error.PERMISSION_DENIED:
        msg = 'Location permission denied. Please allow location access in browser.'
        break
      case error.POSITION_UNAVAILABLE:
        msg = 'GPS signal lost. Searching for satellite lock...'
        break
      case error.TIMEOUT:
        msg = 'GPS request timed out. Retrying...'
        break
    }
    setState(prev => ({ ...prev, error: msg }))
  }, [])

  // Start watching
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported on this device' }))
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true, // Force hardware GPS chip over WiFi triangulation
      maximumAge: 0,            // Do not use cached readings
      timeout: 10000            // 10 second timeout
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      options
    )

    setState(prev => ({ ...prev, isTracking: true }))
  }, [handlePosition, handleError])

  // Stop watching
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setState(prev => ({ ...prev, isTracking: false }))
  }, [])

  // Manage online/offline network listeners
  useEffect(() => {
    const handleOnline = async () => {
      setState(prev => ({ ...prev, isOnline: true }))
      // Flush buffered pings on reconnect
      await offlineBuffer.replayAll(supabase)
      const count = await offlineBuffer.count()
      setState(prev => ({ ...prev, bufferedCount: count }))
    }

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      stopTracking()
    }
  }, [supabase, stopTracking])

  return {
    ...state,
    startTracking,
    stopTracking
  }
}
```

---

### Step 3: Screen Wake Lock API Integration (`navigator.wakeLock`)

#### 3.1 Challenge & Solution
On Android Chrome, operating systems aggressively throttle or suspend browser tabs after 30–60 seconds of screen inactivity. If the driver's phone screen locks, `watchPosition` intervals degrade from 8 seconds to minutes, or halt completely.

The **Screen Wake Lock API** prevents the display and CPU from sleeping. However, wake locks are automatically released whenever:
1. The user minimizes the browser or receives an incoming phone call (`document.visibilityState === 'hidden'`).
2. Device battery drops below 10% on certain Android OEM skins.

The hook must monitor `visibilitychange` and **re-request the lock automatically** as soon as the driver returns to the app.

#### 3.2 Wake Lock Controller Hook
Create `frontend/src/hooks/useScreenWakeLock.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useScreenWakeLock() {
  const [isLocked, setIsLocked] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    setIsSupported('wakeLock' in navigator)
  }, [])

  const requestLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return false

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      setIsLocked(true)

      wakeLockRef.current.addEventListener('release', () => {
        setIsLocked(false)
        wakeLockRef.current = null
      })

      return true
    } catch (err) {
      console.warn('Wake Lock request failed:', err)
      setIsLocked(false)
      return false
    }
  }, [])

  const releaseLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release()
      wakeLockRef.current = null
      setIsLocked(false)
    }
  }, [])

  // Auto re-acquire wake lock if interrupted by incoming phone call
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        await requestLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      releaseLock()
    }
  }, [requestLock, releaseLock])

  return { isLocked, isSupported, requestLock, releaseLock }
}
```

---

### Step 4: Offline GPS Ring-Buffer with IndexedDB Replay Sync

#### 4.1 Architecture & Schema
When entering mobile dead zones in the valley, location records must not be discarded. We implement a local **FIFO Ring Buffer** with a capacity of **50 points** (representing ~8–10 minutes of driving at 10-second intervals).

Storage engine: `IndexedDB` (with an in-memory array fallback if IndexedDB is blocked in private browsing).

Create `frontend/src/utils/offlineGpsBuffer.ts`:

```typescript
import { SupabaseClient } from '@supabase/supabase-js'

export interface BufferedLocation {
  schedule_id: string
  vehicle_id: string
  driver_id: string
  latitude: number
  longitude: number
  speed: number | null
  heading: number | null
  accuracy: number | null
  recorded_at: string
}

const DB_NAME = 'pathersaathi_telemetry_cache'
const STORE_NAME = 'gps_buffer'
const MAX_BUFFER_SIZE = 50

class OfflineGpsBuffer {
  private memoryFallback: BufferedLocation[] = []

  private async getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) return null

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { autoIncrement: true })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    })
  }

  // Push new ping to ring buffer; discard oldest if > 50
  public async push(point: BufferedLocation): Promise<void> {
    const db = await this.getDB()
    if (!db) {
      if (this.memoryFallback.length >= MAX_BUFFER_SIZE) {
        this.memoryFallback.shift() // drop oldest
      }
      this.memoryFallback.push(point)
      return
    }

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const countReq = store.count()

      countReq.onsuccess = () => {
        if (countReq.result >= MAX_BUFFER_SIZE) {
          // Open cursor and delete oldest record
          const cursorReq = store.openCursor()
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result
            if (cursor) {
              store.delete(cursor.key)
            }
          }
        }
        store.add(point)
        resolve()
      }
      countReq.onerror = () => resolve()
    })
  }

  // Count pending records
  public async count(): Promise<number> {
    const db = await this.getDB()
    if (!db) return this.memoryFallback.length

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).count()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(0)
    })
  }

  // Replay all buffered points to Supabase in chunks of 10
  public async replayAll(supabase: SupabaseClient): Promise<void> {
    const db = await this.getDB()
    let records: BufferedLocation[] = []

    if (!db) {
      records = [...this.memoryFallback]
      this.memoryFallback = []
    } else {
      records = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => resolve([])
      })
    }

    if (records.length === 0) return

    console.log(`Replaying ${records.length} buffered GPS points to cloud...`)

    // Batch insert in chunks of 10
    const chunkSize = 10
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize)
      try {
        const { error } = await supabase.from('trip_locations').insert(chunk)
        if (error) throw error
      } catch (err) {
        console.error('Failed to replay batch chunk:', err)
        return // preserve remaining for next online attempt
      }
    }

    // Clear store after successful upload
    if (db) {
      const clearTx = db.transaction(STORE_NAME, 'readwrite')
      clearTx.objectStore(STORE_NAME).clear()
    }
  }
}

export const offlineBuffer = new OfflineGpsBuffer()
```

---

### Step 5: Passenger Live Tracking Subscription Hook (`useLiveBusTracking`)

#### 5.1 Realtime Channel Architecture
1. The passenger client queries the latest recorded location for the `schedule_id`.
2. Establishes a Supabase Realtime WebSocket subscription filtered to `public.trip_locations` where `schedule_id=eq.${scheduleId}`.
3. Implements **coordinate interpolation (Lerp)** so the marker glides along the road instead of popping abruptly every 10 seconds.
4. Maintains a **freshness countdown timer**: if no message arrives within 45 seconds, flags the connection as stalled.

#### 5.2 Complete Implementation
Create `frontend/src/hooks/useLiveBusTracking.ts`:

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface LiveLocationData {
  latitude: number
  longitude: number
  speed: number | null
  heading: number | null
  accuracy: number | null
  recorded_at: string
}

export function useLiveBusTracking(scheduleId: string) {
  const [currentLocation, setCurrentLocation] = useState<LiveLocationData | null>(null)
  const [isLive, setIsLive] = useState<boolean>(false)
  const [secondsSinceLastPing, setSecondsSinceLastPing] = useState<number>(0)
  const [tripStatus, setTripStatus] = useState<string>('scheduled')

  const supabase = createClient()
  const lastPingTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    let isMounted = true

    // 1. Fetch initial latest telemetry point and current schedule status
    const fetchInitialData = async () => {
      const { data: scheduleData } = await supabase
        .from('schedules')
        .select('status')
        .eq('id', scheduleId)
        .single()

      if (scheduleData && isMounted) {
        setTripStatus(scheduleData.status)
      }

      const { data: latestLocation } = await supabase
        .from('trip_locations')
        .select('latitude, longitude, speed, heading, accuracy, recorded_at')
        .eq('schedule_id', scheduleId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latestLocation && isMounted) {
        setCurrentLocation(latestLocation)
        lastPingTimeRef.current = new Date(latestLocation.recorded_at).getTime()
        setIsLive(true)
      }
    }

    fetchInitialData()

    // 2. Subscribe to Realtime INSERT events on trip_locations
    const channel = supabase
      .channel(`live-bus-${scheduleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_locations',
          filter: `schedule_id=eq.${scheduleId}`
        },
        (payload) => {
          if (!isMounted) return
          const newLoc = payload.new as LiveLocationData
          setCurrentLocation(newLoc)
          lastPingTimeRef.current = Date.now()
          setIsLive(true)
          setSecondsSinceLastPing(0)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schedules',
          filter: `id=eq.${scheduleId}`
        },
        (payload) => {
          if (!isMounted) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updatedSchedule = payload.new as any
          if (updatedSchedule.status) {
            setTripStatus(updatedSchedule.status)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to live telemetry for schedule ${scheduleId}`)
        }
      })

    // 3. Heartbeat ticker to track elapsed time since last location ping
    const ticker = setInterval(() => {
      if (!isMounted) return
      const diffSecs = Math.round((Date.now() - lastPingTimeRef.current) / 1000)
      setSecondsSinceLastPing(diffSecs)

      // If no ping for > 45 seconds, indicate signal degradation
      if (diffSecs > 45) {
        setIsLive(false)
      }
    }, 1000)

    return () => {
      isMounted = false
      clearInterval(ticker)
      supabase.removeChannel(channel)
    }
  }, [scheduleId, supabase])

  return {
    currentLocation,
    isLive,
    secondsSinceLastPing,
    tripStatus
  }
}
```

---

### Step 6: Integration with Existing PostgreSQL Schema & Atomic RPCs

The backend procedures established in `supabase/migrations/20260902000001_driver_and_live_tracking.sql` are integrated into frontend action dispatchers:

#### 6.1 Trip Start Flow
```typescript
// Driver taps [ START TRIP / যাত্রা শুরু করুন ]
const handleStartTrip = async (scheduleId: string) => {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('driver_start_trip', {
    p_schedule_id: scheduleId
  })

  if (error || !data?.success) {
    alert(data?.error || 'Could not start trip. Please check authorization.')
    return false
  }

  // Request Wake Lock and initialize geolocation
  await wakeLock.requestLock()
  driverLocation.startTracking()
  return true
}
```

#### 6.2 Trip End Flow (With Guarded 2s Hold)
```typescript
// Driver completes 2-second press-and-hold on [ END TRIP / যাত্রা শেষ করুন ]
const handleEndTrip = async (scheduleId: string) => {
  const supabase = createClient()
  
  // Replay any final buffered points before closing trip
  await offlineBuffer.replayAll(supabase)
  
  const { data, error } = await supabase.rpc('driver_end_trip', {
    p_schedule_id: scheduleId
  })

  if (error || !data?.success) {
    alert(data?.error || 'Failed to finish trip.')
    return false
  }

  // Cleanly shut down telemetry and wake lock
  driverLocation.stopTracking()
  await wakeLock.releaseLock()
  router.push(`/driver/summary/${scheduleId}`)
  return true
}
```

---

### Step 7: Battery, Thermal & Background Execution Optimizations

Transmitting continuous GPS over cellular connections generates heat and consumes battery. We apply four specific performance optimizations:

1. **Adaptive Dynamic Throttling**:
   - High speed (>30 km/h): Transmit every 8 seconds (ensures smooth passenger map progression).
   - Moderate speed (10–30 km/h): Transmit every 12 seconds.
   - Idling / Traffic halt (<5 km/h): Extend transmission interval to **20 seconds** to preserve battery while parked at bus terminals or railway crossings.
2. **OLED Dark-Mode Architecture**:
   - Every driver screen is rendered with pitch-black backgrounds (`#000000` / `#001712`). On OLED and AMOLED screens typical of modern budget smartphones, black pixels draw zero electrical current.
3. **Audio Synthesis via Web Audio API**:
   - Rather than fetching external MP3 audio files over mobile networks (which fail in dead zones), sounds are synthesized locally in <5 lines of code using `AudioContext` and `OscillatorNode`:
   ```typescript
   export function playChime(freq1 = 440, freq2 = 880) {
     if (typeof window === 'undefined') return
     const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
     const osc = ctx.createOscillator()
     const gain = ctx.createGain()
     osc.connect(gain)
     gain.connect(ctx.destination)
     osc.frequency.setValueAtTime(freq1, ctx.currentTime)
     osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + 0.15)
     gain.gain.setValueAtTime(0.3, ctx.currentTime)
     gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
     osc.start()
     osc.stop(ctx.currentTime + 0.3)
   }
   ```
4. **Service Worker Geolocation Fallback**:
   - Register a lightweight Service Worker (`public/sw.js`) that intercepts lifecycle events and maintains WebSocket subscription ping heartbeats.

---

## 7. End-to-End Telemetry State Machine Diagram

The following state machine governs the entire lifecycle from schedule assignment to trip closure:

```
                      +-----------------------------+
                      |       1. IDLE / LOGIN       |
                      |   Driver authenticates at   |
                      |       /driver/login         |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |      2. TRIP ASSIGNED       |
                      |   Driver reviews run card   |
                      |  Pre-flight GPS test: OK    |
                      +--------------+--------------+
                                     |
                       [ Tap "START TRIP" Button ]
                                     |
                                     v
                      +-----------------------------+
                      |   3. RPC: driver_start_trip |
                      |    schedules.status ->      |
                      |        'in_transit'         |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
+-------------------------------+           +-------------------------------+
|    4A. ACQUIRE WAKE LOCK      |           |     4B. AUDIO/HAPTIC CHIME    |
| navigator.wakeLock.request()  |           | Ascending tone + 100ms vibrate|
+--------------+----------------+           +---------------+---------------+
               |                                            |
               +---------------------+----------------------+
                                     |
                                     v
                      +-----------------------------+
                      |    5. ACTIVE HUD MONITOR    |
                      | watchPosition() stream loop |
                      | Filter: delta > 15m or 8s   |
                      +--------------+--------------+
                                     |
                       [ Check Network Connection ]
                                    / \
                                   /   \
                      (Online = True) (Online = False)
                                 /       \
                                v         v
            +----------------------+   +-----------------------+
            | 6A. CLOUD STREAMING  |   | 6B. OFFLINE BUFFER    |
            | INSERT trip_locations|   | IDB Ring-Buffer (50)  |
            | Realtime WAL trigger |   | HUD turns Amber       |
            +----------+-----------+   +-----------+-----------+
                       |                           |
                       |                  [ Network Returns ]
                       |                           |
                       +-------------<-------------+
                                     |
                                     v
                      +-----------------------------+
                      |    7. TERMINUS ARRIVAL      |
                      | Driver holds "END TRIP" 2s  |
                      +--------------+--------------+
                                     |
                       [ Hold Completed (2000ms) ]
                                     |
                                     v
                      +-----------------------------+
                      |    8. RPC: driver_end_trip  |
                      |     schedules.status ->     |
                      |         'completed'         |
                      |      Release Wake Lock      |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |    9. TRIP SUMMARY REPORT   |
                      |  Duration, km, ping stats   |
                      +-----------------------------+
```

---

## 8. Failure Mode & Edge-Case Resilience Matrix

| Failure Scenario | Immediate Detection Trigger | Automated System Behavior | Driver / Passenger Experience |
|---|---|---|---|
| **GPS Permission Denied** | `error.code === 1` in `watchPosition` | Halts start transition; displays full-screen high-contrast modal with visual screenshot guide on enabling location in browser settings. | Clear bilingual prompt: *"Please enable Location Services / লোকেশন অন করুন"*. Button does not start until GPS is active. |
| **Highway Dead Zone (No 4G)** | `window.addEventListener('offline')` or fetch failure | Switches telemetry sink to `IndexedDB` ring buffer; updates HUD header to Amber (`#FFB300`). | Driver sees: *"Offline — recording to memory"*. Passenger sees: *"Bus in transit — last seen 2 mins ago"*. |
| **Incoming Phone Call** | `document.visibilityState === 'hidden'` | Wake Lock sentinel is released by OS; telemetry pauses temporarily. | When call ends and driver re-opens browser, `visibilitychange` fires and immediately re-acquires Wake Lock and resyncs GPS. |
| **Driver Phone Dies Mid-Trip** | Telemetry halts without `driver_end_trip` | Passenger map detects >45s ping gap; displays *"GPS signal paused"*. | Operator dashboard displays schedule with warning flag *"Telemetry lost > 10m"*. Operator can manually mark completed or reassign. |
| **Accidental Screen Tap** | Driver bumps screen while shifting gear or over potholes | Single taps on the "End Trip" button are ignored; only continuous 2-second hold triggers termination. | Visual progress circle resets immediately if finger slips before 2.0 seconds elapse. |
| **Vehicle Breakdown / Flood Blockage** | Driver taps quick-action button *"Traffic / Breakdown"* | Inserts instant broadcast note to `schedules.operator_notes` and alerts operator cabin. | Passengers tracking the bus immediately see a banner: *"Bus stopped: Heavy traffic / breakdown reported"*. |

---

## 9. Security, Privacy & DPDPA Compliance Guidelines

Because live tracking involves continuous geolocation collection, the implementation adheres strictly to India's **Digital Personal Data Protection Act (DPDPA 2023)**:

### 9.1 Row-Level Security (RLS) Verification
Telemetry records in `public.trip_locations` are strictly compartmentalized:
1. **Insert**: Authenticated drivers can only insert rows where `driver_id = auth.uid()` and their role is `'driver'`.
2. **Read (Passengers)**: Authenticated passengers can only read telemetry for a `schedule_id` where they hold an **approved** booking (`status = 'approved'`).
3. **Read (Operators)**: Operators can monitor all buses in their fleet.

### 9.2 30-Day Automated Telemetry Retention Schedule
High-frequency GPS pings consume substantial storage over time (approx. 400 pings per trip). A scheduled `pg_cron` worker (enabled in migration 18) purges telemetry older than 30 days while preserving aggregate schedule statistics:

```sql
-- Schedule telemetry cleanup every Sunday at 02:00 AM UTC
SELECT cron.schedule(
    'purge_old_telemetry',
    '0 2 * * 0',
    $$
    DELETE FROM public.trip_locations
    WHERE recorded_at < (now() - INTERVAL '30 days');
    $$
);
```

### 9.3 Explicit Driver Consent & Tracking Boundary
- Telemetry recording **begins strictly when the driver presses "Start Trip"** and **terminates immediately when "End Trip" is confirmed**.
- The driver HUD displays an unambiguous indicator confirming when location transmission is active. At no point is background location collected outside of an active scheduled journey.

---

## 10. Execution Checklist for Engineering Team

| Task ID | Implementation Component | Target File(s) | Verification Command / Check |
|---|---|---|---|
| **T1** | Install Leaflet and TypeScript definitions | `frontend/package.json` | `npm list leaflet @types/leaflet` |
| **T2** | Refresh database types to include `trip_locations` and `driver_id` | `frontend/src/types/database.types.ts` | Verify table definition matches SQL migration |
| **T3** | Implement offline ring-buffer utility | `frontend/src/utils/offlineGpsBuffer.ts` | Test IndexedDB batch push and replay logic |
| **T4** | Build Screen Wake Lock custom hook | `frontend/src/hooks/useScreenWakeLock.ts` | Verify wake lock acquires and survives tab refocus |
| **T5** | Build Driver Geolocation hook with jitter filtering | `frontend/src/hooks/useDriverLocation.ts` | Verify Haversine filter rejects <15m station wobble |
| **T6** | Build Driver HUD and screen flow | `frontend/src/app/driver/trip/[scheduleId]/page.tsx` | Test 80px touch buttons, Bengali labels, and 2s hold |
| **T7** | Build Passenger Realtime Tracking hook | `frontend/src/hooks/useLiveBusTracking.ts` | Verify WebSocket subscription receives live pings |
| **T8** | Build Dynamic Leaflet Passenger Map component | `frontend/src/components/map/LiveBusMap.tsx` | Verify SSR-disabled loading and custom bus marker |
| **T9** | Embed "Track Bus" entry point in customer booking ledger | `frontend/src/app/bookings/page.tsx` | Verify button renders for approved active runs |

---

*End of Authoritative Plan — Requirement R2: Driver Live Tracking Architecture.*

## 7. Passenger Tracking UX Update: Login-Gated Homepage Flow

Based on updated product requirements, live tracking will now be surfaced directly on the public homepage to drive engagement, but accessing the actual map data remains strictly **login-gated**.

### 7.1 The "Hero Section" Entry Point
- **Location:** In the main Hero banner, adjacent to the existing `[Book a Whole Bus]` primary action.
- **Component:** A new button labeled `[ 📡 Track Live Buses ]` (or similar).
- **Action:** Clicking this button does *not* immediately demand a login. Instead, it smoothly scrolls the user down to (or opens a modal for) an "Available Live Buses" grid.

### 7.2 The Selection Grid
- The grid displays currently active buses or upcoming schedules.
- Users can freely browse which buses are en-route.
- **The Trigger:** When the user clicks on a specific bus card to view its live map...

### 7.3 The Authentication Gate
At the moment the user clicks a bus to track it, the system checks the Supabase authentication state.
- **If Logged In (Authenticated):** 
  - The Live Tracking Map (Leaflet) component opens smoothly, pulling the active `scheduleId`.
- **If Logged Out (Unauthenticated):**
  - The map does *not* load.
  - A custom, beautifully designed modal intercepts the action:
    *"To view the live GPS location of this bus and ensure passenger safety, please log in to your Pather Saathi account."*
  - The modal provides buttons to `[Log In]` or `[Create Account]`.
  - Clicking these buttons pushes the user to `/login` with a `?redirect=/track/[scheduleId]` parameter, so once they log in, they are immediately bounced back to the exact bus map they wanted to see.

This flow maximizes public SEO and engagement (letting people see that tracking *exists*) while enforcing data privacy and driving user registrations through a high-value gate.
