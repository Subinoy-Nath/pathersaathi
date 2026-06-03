# Known Issues — Pather Saathi

**Date**: 2026-06-03  
**Audit Method**: Line-by-line comparison of `PROJECT_ARTIFACT.md` against actual codebase.

---

## D-01: `users.role` enum includes phantom `admin` value

| Field | Detail |
|-------|--------|
| **Severity** | 🔴 High |
| **File** | `docs/PROJECT_ARTIFACT.md` line ~39 |
| **Claim** | `role` enum is `admin / operator / customer` |
| **Reality** | `CHECK (role IN ('customer', 'operator'))` — [core_schema.sql L10](../supabase/migrations/20260603000001_core_schema.sql) |
| **Impact** | Documentation fabricates a role that the database will reject. Misleads future developers into building admin-gated features that cannot work. |
| **Fix** | Remove `admin` from the artifact's role enum list. |

---

## D-02: `bookings` table has undocumented columns

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **File** | `docs/PROJECT_ARTIFACT.md` line ~72 |
| **Claim** | Columns listed: `id, customer_id, schedule_id, travel_date, seats_requested, status, booking_reference, operator_notes` |
| **Reality** | Additional columns exist: `booking_type` (CHECK: `ticket`/`whole_vehicle`), `total_price`, `start_date`, `end_date`, `created_at`, `updated_at`, `deleted_at` |
| **Impact** | The `booking_type` column and its `bookings_ticket_schedule_required` constraint are architecturally significant — they define two fundamentally different booking flows. |
| **Fix** | Add all missing columns to the artifact's bookings table documentation. |

---

## D-03: `booking_vehicles` table undocumented

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **File** | `docs/PROJECT_ARTIFACT.md` — entire document |
| **Claim** | Table is not mentioned anywhere |
| **Reality** | Exists in [bookings_schema.sql L27-35](../supabase/migrations/20260603000008_bookings_schema.sql) with UNIQUE constraint, FK relationships, and RLS policies in [bookings_rls.sql](../supabase/migrations/20260603000009_bookings_rls.sql) |
| **Impact** | Junction table for whole-vehicle bookings. Any developer reading the artifact has no idea it exists. |
| **Fix** | Add `booking_vehicles` section to the Database Schema table listing. |

---

## D-04: Locations RLS — "active only" wording is misleading

| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **File** | `docs/PROJECT_ARTIFACT.md` line ~46 |
| **Claim** | `Public read (active only)` |
| **Reality** | Policy uses `deleted_at IS NULL`. There is no `is_active` column on `locations`. |
| **Fix** | Change to `Public read (non-deleted)`. |

---

## D-05: Migration filenames omit date prefix

| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **File** | `docs/PROJECT_ARTIFACT.md` lines ~204-220 |
| **Claim** | `000001_core_schema.sql`, etc. |
| **Reality** | `20260603000001_core_schema.sql`, etc. |
| **Fix** | Add date prefix or document the naming convention. |

---

## D-06: `/login` missing `LoginForm.tsx` from component listing

| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **File** | `docs/PROJECT_ARTIFACT.md` line ~117 |
| **Claim** | Components column lists only `login/page.tsx` |
| **Reality** | Route also contains `LoginForm.tsx` (client component) and `actions.ts` |
| **Fix** | Add `LoginForm.tsx` to the components column. |

---

## D-07: `BookingActionButtons.tsx` not in frontend inventory

| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **File** | `docs/PROJECT_ARTIFACT.md` line ~118 |
| **Claim** | `/operator` components listed as `operator/page.tsx` |
| **Reality** | Page imports and renders `BookingActionButtons.tsx` — the approve/reject/cancel UI with mandatory-reason flow |
| **Fix** | Add `BookingActionButtons.tsx` to the operator route's components column. |

---

## D-08: "Next.js 15+" inconsistent with actual "16.2.6"

| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **File** | `docs/PROJECT_ARTIFACT.md` line ~26 vs line ~14 |
| **Claim** | Line 26 says `Next.js 15+`, line 14 says `16.2.6` |
| **Fix** | Unify to `Next.js 16`. |

---

## D-09: Phone validation inconsistency between signup and profile

| Field | Detail |
|-------|--------|
| **Severity** | 🟡 Medium |
| **File** | `docs/PROJECT_ARTIFACT.md` line ~103 |
| **Claim** | `Phone numbers: strict +91[0-9]{10} regex enforced server-side.` |
| **Reality** | **Profile update** uses strict `/^\+91[0-9]{10}$/` — correct. **Signup** uses permissive `/^\+[1-9]\d{1,14}$/` — accepts any E.164 international number. |
| **Impact** | A user can sign up with a non-Indian phone number, but cannot update their profile to that same number later. Inconsistent validation. |
| **Fix** | Either tighten signup to match profile's `+91` restriction, or relax the artifact claim to "strict +91 on profile update; E.164 on signup". |

---

## D-10: `image_url` validation description is underspecified

| Field | Detail |
|-------|--------|
| **Severity** | 🟢 Low |
| **File** | `docs/PROJECT_ARTIFACT.md` line ~104 |
| **Claim** | `image_url must match /images/[filename].(jpg|jpeg|png|webp)` |
| **Reality** | Actual regex: `/^\/images\/[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp)$/` — restricts filenames to alphanumeric + underscore + hyphen only |
| **Fix** | Specify the character restrictions for completeness. |
