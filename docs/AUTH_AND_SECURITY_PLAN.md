# Pather Saathi — Authentication & Security Architecture Plan (Requirement R4)

**Document Version**: 1.0.0  
**Status**: Authoritative Technical & UX Plan  
**Target Milestone**: Authentication & Security Modernization (R4)  
**Target Platform**: Next.js 16 (App Router), Supabase (@supabase/ssr ^0.10.3, @supabase/supabase-js ^2.107.0), PostgreSQL 15+  
**Target Market**: Northeast India (Assam transit corridor, +91 phone numbering, INR transactions)  

---

## 1. Executive Summary & Architectural Vision

### 1.1 Context and Problem Statement
Pather Saathi is a modern bus transit booking and fleet management system serving Northeast India. While the existing infrastructure exhibits solid security foundations—including strict Row-Level Security (RLS), atomic PostgreSQL RPCs for booking seat transactions, and `@supabase/ssr` cookie session persistence—the user authentication subsystem suffers from acute operational blockers that impede user growth:

1. **Email-Only Incompatibility with Emerging Markets**: Northeast Indian bus passengers predominantly operate smartphone-first with mobile numbers and WhatsApp, frequently lacking active email habits. The current system exclusively mandates email-and-password registration.
2. **Fatal Database Constraint (`NOT NULL` Email)**: `public.users.email` is declared `TEXT NOT NULL UNIQUE` (`20260603000001_core_schema.sql:7`). When a user attempts Supabase Phone OTP signup, Supabase Auth creates an `auth.users` record with `email = NULL`. The subsequent trigger `handle_new_user()` attempts to insert `NULL` into `public.users.email`, crashing the insert and leaving an orphaned auth account without a profile.
3. **Missing PKCE Route Handler (`/auth/callback/route.ts`)**: The codebase lacks a route handler to exchange Supabase PKCE authorization codes for session cookies. Consequently, **Magic Links, Forgot Password recovery links, and Social OAuth (Google/Apple) fail with 404 Not Found errors**.
4. **No Password Recovery Flow**: No interface or server action exists for `resetPasswordForEmail`. A user who forgets their password is permanently locked out.
5. **Phone Validation Discrepancy**: `login/actions.ts` permits generic E.164 formats (`/^\+[1-9]\d{1,14}$/`), whereas `profile/actions.ts` strictly rejects any number not matching `^\+91[0-9]{10}$`. Users registering with international formats are subsequently blocked from saving profile changes.

### 1.2 Architectural Objectives
This document establishes a complete, zero-code technical and UX blueprint to:
- Introduce **Phone Number OTP Login & Registration** tailored to Indian telecom pricing and regulatory standards (TRAI DLT).
- Enable **Passwordless Magic Links** and self-service **Password Recovery** ("Forgot Password").
- Integrate **One-Tap Google OAuth** and prepare the pipeline for Apple Sign-In.
- Fix database schema and trigger incompatibilities while preserving backwards compatibility and owner auto-claiming.
- Harmonize validation patterns and harden authentication against brute-force attacks via Redis-backed rate limiting.

---

## 2. SMS / OTP Provider Comparison & Cost Analysis

### 2.1 Provider Evaluation Matrix

In India, SMS messaging is strictly regulated by the Telecom Regulatory Authority of India (TRAI). Any commercial or transactional SMS must route through registered Distributed Ledger Technology (DLT) portals. Furthermore, international SMS delivery from global CPaaS vendors to Indian telecom operators carries steep surcharges.

| Evaluation Metric | Twilio (Global Native) | Textlocal India (Domestic Native) | MSG91 (Enterprise Domestic via Hook) | Fast2SMS (Budget Domestic via Hook) |
|---|---|---|---|---|
| **Domestic India Rate per SMS** | **~$0.0832 (~₹6.90 – ₹7.00)** | **₹0.20 – ₹0.295** | **₹0.16 – ₹0.25** | **₹0.11 – ₹0.25** |
| **Cost per 1,000 OTPs** | ~₹6,950 ($83.20) | ~₹260 – ₹295 | ~₹200 – ₹250 | ~₹190 – ₹250 |
| **Cost per 10,000 OTPs** | **~₹69,500 ($832.00)** | **~₹2,200 – ₹2,600** | **~₹1,800 – ₹2,000** | **~₹1,700 – ₹1,900** |
| **Cost per 50,000 OTPs** | ~₹3,47,500 ($4,160.00) | ~₹10,500 – ₹12,000 | ~₹8,500 – ₹9,000 | ~₹7,500 – ₹8,500 |
| **Cost Discrepancy vs Twilio** | *Baseline (1x)* | **26x – 31x Cheaper** | **35x – 38x Cheaper** | **36x – 40x Cheaper** |
| **Supabase Integration Effort** | Native Config in `config.toml` (`[auth.sms.twilio]`) | Native Config in `config.toml` (`[auth.sms.textlocal]`) | Auth Hook (Edge Function / HTTPS webhook) | Auth Hook (Edge Function / HTTPS webhook) |
| **Billing Currency & Taxes** | USD + International Forex fee | INR + 18% GST invoice | INR + 18% GST invoice | INR (Prepaid Wallet) |
| **TRAI DLT Assistance** | Minimal; manual enterprise coordination | Assisted DLT registration guide | Native DLT entity linking in dashboard | Self-serve DLT + "Quick SMS" developer bypass route |
| **Multi-Channel Fallover** | WhatsApp, Voice, SMS (Requires Verify API at $0.05/verif) | SMS only | **SMS + WhatsApp OTP + Voice Failover** built-in | SMS only |
| **Deliverability in Assam / NE** | Medium-High (carrier filtering risk) | High (direct telecom operator pipes) | Very High (direct telecom routing + WhatsApp fallback) | High |

### 2.2 Cost Breakdown & Impact Analysis
- **Twilio**: While natively supported in Supabase without code, Twilio's international terminating fee into Indian networks (Airtel, Jio, Vi, BSNL) makes it economically unviable for an Indian transit startup. At 10,000 monthly user logins or ticket verification OTPs, an expenditure of **₹69,500/month** on Twilio vs **₹1,800/month** on MSG91 represents a 97.4% waste of operational capital.
- **Textlocal**: Ideal for low-friction setup because Supabase Auth includes native support for Textlocal via `[auth.sms.textlocal]` in `config.toml`. It charges standard Indian domestic rates (approx. 20–29 paise per SMS).
- **MSG91**: The gold standard for Indian startups. It offers volume tiering down to 16 paise/SMS, native WhatsApp OTP routing (which costs ~12–14 paise and has higher delivery rates in rural Northeast India where cellular network congestion delays standard SMS), and a unified REST API called via Supabase's `Send SMS` Auth Hook.
- **Fast2SMS**: Highly accessible for initial development testing. Its prepaid wallet model allows recharging with as little as ₹100 without upfront enterprise commitments.

### 2.3 Regulatory Requirement: TRAI DLT Compliance Workflow
Under TRAI regulations, unregistered commercial SMS is instantly rejected by telecom firewalls. To use Textlocal, MSG91, or Fast2SMS in production, Pather Saathi must execute the following DLT registration pipeline:

```
+-----------------------------------------------------------------------------------------+
|                                TRAI DLT REGISTRATION PIPELINE                           |
+-----------------------------------------------------------------------------------------+
|  1. Principal Entity (PE) Registration:                                                 |
|     Register business on a telecom DLT portal (Jio DLT, Airtel DLT, or Vodafone Vilpower)|
|     Submit: Certificate of Incorporation / Trade License, PAN Card, Authorized Signatory|
|     Output: Unique Entity ID (PE ID)                                                    |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|  2. Sender ID / Header Registration:                                                    |
|     Apply for 6-character alpha Header for Service-Implicit / Transactional route       |
|     Example: "PATHRS" or "PTSATH"                                                       |
|     Output: Approved Header String                                                      |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|  3. Content Template Registration:                                                      |
|     Register exact template string with variables:                                      |
|     "Your Pather Saathi verification code is {#var#}. Valid for 10 minutes. Do not share|
|      this OTP with anyone. - PATHER SAATHI"                                             |
|     Output: Approved Template ID (e.g., 140716892304918234)                             |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|  4. Provider Mapping:                                                                   |
|     Map the PE ID, Header, and Template ID into MSG91 / Textlocal / Fast2SMS dashboard   |
+-----------------------------------------------------------------------------------------+
```

> **Local Development & Staging Bypass**: During local development and CI testing, TRAI DLT registration is **not** required. Supabase Auth supports test phone numbers and fixed OTPs via `config.toml` (e.g., `+919876543210` -> `123456`), completely bypassing SMS dispatch fees and carrier networks.

### 2.4 Architecture Recommendation
1. **Development & Staging**: Use Supabase Local Auth test numbers (`[auth.sms.test_otp]`).
2. **Production MVP**: Deploy the **Supabase Send SMS Auth Hook (Edge Function)** routing to **MSG91**. This gives Pather Saathi:
   - Lowest per-unit cost (₹0.18/SMS).
   - Dynamic fallover to WhatsApp OTP if SMS is delayed in Assam hill stations.
   - Clean decoupling: Supabase generates the OTP cryptographically and tracks session validation; the Edge Function handles only transmission.

---

## 3. Core Database Migration Prerequisites

### 3.1 The Critical Blocker: `public.users.email NOT NULL`
In `supabase/migrations/20260603000001_core_schema.sql`, line 7 defines:
```sql
email TEXT NOT NULL UNIQUE,
```
When a user signs up with Phone OTP:
1. Supabase Auth inserts into `auth.users` with `phone = '+919876543210'` and `email = NULL`.
2. The trigger `on_auth_user_created` calls `public.handle_new_user()`.
3. `handle_new_user()` executes:
   ```sql
   INSERT INTO public.users (id, name, email, phone_number, role, verification_status)
   VALUES (new.id, safe_name, new.email, ...);
   ```
4. PostgreSQL raises: `null value in column "email" of relation "users" violates not-null constraint`.
5. The `EXCEPTION WHEN OTHERS` block catches the error and outputs a warning, but **aborts insertion**.
6. The user is logged in via Auth, but has **no record in `public.users`**. Every subsequent application query requiring user profile, role, or bookings fails, redirecting the passenger back to `/login`.

Furthermore, in `supabase/migrations/20260902000001_driver_and_live_tracking.sql`, line 160:
```sql
safe_name := NULLIF(TRIM(new.raw_user_meta_data->>'name'), '');
IF safe_name IS NULL THEN
    safe_name := 'System Admin'; -- [BUG: Regular phone users without names become "System Admin"]
END IF;
```

### 3.2 Database Migration Specification (`20260914000001_auth_r4_phone_and_oauth.sql`)
To completely eliminate this blocker, the following operations must be executed in an atomic migration:

1. **Alter Email Nullability**: Drop `NOT NULL` on `public.users.email`.
2. **Partial Unique Indexes**: Drop table-level `UNIQUE` constraints that prevent multiple `NULL` values in older SQL engines or cause collisions, and replace with PostgreSQL partial indexes (`WHERE email IS NOT NULL` and `WHERE phone_number IS NOT NULL`).
3. **Role Check Expansion**: Expand `users_role_check` to officially include `'admin'`: `CHECK (role IN ('customer', 'operator', 'driver', 'admin'))`.
4. **Trigger Overhaul**: Update `handle_new_user()` to:
   - Check `new.phone` first (native Supabase phone auth) before falling back to metadata.
   - Assign user-friendly fallback names: `'Passenger ' || RIGHT(normalized_phone, 4)` for phone signups, or `'Passenger'` if no phone is present, rather than `'System Admin'`.
   - Preserve support@pathersaathi.in operator auto-claiming and vehicle re-linking.
   - Use `ON CONFLICT (id) DO UPDATE` to gracefully merge metadata if a user subsequently links email and phone.

```sql
-- Migration: 20260914000001_auth_r4_phone_and_oauth.sql
-- Description: Allow phone-only users, partial unique indexes, role check consistency, and trigger update.

BEGIN;

-- 1. Make email nullable in public.users
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- 2. Drop existing table-level constraints if present
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_number_key;

-- 3. Create partial unique indexes for performance and data integrity
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx 
    ON public.users(LOWER(email)) 
    WHERE email IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique_idx 
    ON public.users(phone_number) 
    WHERE phone_number IS NOT NULL AND deleted_at IS NULL;

-- 4. Harmonize role check constraint to include 'admin'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('customer', 'operator', 'driver', 'admin'));

-- 5. Updated handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
    normalized_phone text;
    safe_name text;
    is_owner boolean;
BEGIN
    -- 1. Extract phone: prefer native auth.users.phone, fallback to metadata
    normalized_phone := NULLIF(TRIM(COALESCE(
        new.phone,
        new.raw_user_meta_data->>'phone_number',
        new.raw_user_meta_data->>'phone'
    )), '');

    -- 2. Extract display name from metadata (Google OAuth sends 'full_name' or 'name')
    safe_name := NULLIF(TRIM(COALESCE(
        new.raw_user_meta_data->>'name',
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'user_name'
    )), '');

    -- 3. Sensible fallback if name is absent
    IF safe_name IS NULL THEN
        IF normalized_phone IS NOT NULL AND length(normalized_phone) >= 4 THEN
            safe_name := 'Passenger ' || RIGHT(normalized_phone, 4);
        ELSIF new.email IS NOT NULL THEN
            safe_name := split_part(new.email, '@', 1);
        ELSE
            safe_name := 'Passenger';
        END IF;
    END IF;

    -- 4. Owner detection
    is_owner := (new.email IS NOT NULL AND LOWER(TRIM(new.email)) = 'support@pathersaathi.in');

    -- 5. Insert profile with graceful conflict resolution
    BEGIN
        INSERT INTO public.users (
            id,
            name,
            email,
            phone_number,
            role,
            verification_status,
            created_at,
            updated_at
        )
        VALUES (
            new.id,
            safe_name,
            new.email,
            normalized_phone,
            CASE WHEN is_owner THEN 'operator' ELSE 'customer' END,
            CASE WHEN is_owner THEN 'verified' ELSE 'unverified' END,
            now(),
            now()
        )
        ON CONFLICT (id) DO UPDATE SET
            name = COALESCE(public.users.name, EXCLUDED.name),
            email = COALESCE(public.users.email, EXCLUDED.email),
            phone_number = COALESCE(public.users.phone_number, EXCLUDED.phone_number),
            role = CASE WHEN is_owner THEN 'operator' ELSE public.users.role END,
            verification_status = CASE WHEN is_owner THEN 'verified' ELSE public.users.verification_status END,
            updated_at = now();

        -- 6. Preserve owner fleet auto-linking
        IF is_owner THEN
            UPDATE public.vehicles
            SET owner_id = new.id
            WHERE owner_id IS NULL;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'CRITICAL: Failed to create public.users profile for auth UID %: %', new.id, SQLERRM;
    END;

    RETURN new;
END;
$$;

-- 6. Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;
```

### 3.3 Phone Number Regex Harmonization
Currently, two conflicting regex rules exist:
- `login/actions.ts`: `/^\+[1-9]\d{1,14}$/` (Permits any global number up to 15 digits).
- `profile/actions.ts`: `/^\+91[0-9]{10}$/` (Permits only `+91` followed by exactly 10 digits).

**Resolution**: Centralize phone validation in a dedicated helper module (`frontend/src/utils/phone.ts`):
- Standard Indian mobile numbers are 10 digits prefixed by `+91`, where the first mobile digit belongs to `[6, 7, 8, 9]`.
- Regex: `/^\+91[6-9]\d{9}$/`
- Normalization Function: Strips whitespace, dashes, and leading zeros. If a user inputs `9876543210` or `09876543210`, automatically prepends `+91`.

```typescript
// Proposed: frontend/src/utils/phone.ts
export const INDIAN_MOBILE_REGEX = /^\+91[6-9]\d{9}$/

export function normalizeIndianPhoneNumber(input: string): { valid: boolean; normalized: string; error?: string } {
  if (!input) return { valid: false, normalized: '', error: 'Phone number is required.' }

  let cleaned = input.trim().replace(/[\s\-\(\)]/g, '')

  // Handle leading 0 (e.g. 09876543210)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1)
  }

  // Handle 10-digit raw mobile
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+91${cleaned}`
  }

  // Validate final E.164 string
  if (!INDIAN_MOBILE_REGEX.test(cleaned)) {
    return {
      valid: false,
      normalized: cleaned,
      error: 'Invalid Indian mobile number. Please enter a 10-digit number starting with 6-9.'
    }
  }

  return { valid: true, normalized: cleaned }
}
```

---

## 4. Missing PKCE Route Handler Architecture (`/auth/callback/route.ts`)

### 4.1 The Role of the PKCE Callback
Modern `@supabase/ssr` utilizes the **Proof Key for Code Exchange (PKCE)** auth flow. When a user authenticates via:
1. **Magic Link** (email verification link)
2. **Password Reset** ("Forgot Password" recovery link)
3. **Social OAuth** (Google, Apple)

Supabase redirects the browser to `${NEXT_PUBLIC_SITE_URL}/auth/callback?code=<AUTH_CODE>&next=<DESTINATION>`.

Because `frontend/src/app/auth/callback/route.ts` is currently missing, every single one of these links results in a 404 error. The authorization code is never exchanged, cookies are never written, and the user cannot log in.

### 4.2 Sequence Diagram: Complete PKCE Lifecycle

```
User Browser              Next.js (/auth/callback)         Supabase Auth Engine        Destination Page
     |                               |                               |                        |
     | 1. Clicks Link in Email/OAuth |                               |                        |
     |    GET /auth/callback?code=X  |                               |                        |
     |    &next=/reset-password      |                               |                        |
     |------------------------------>|                               |                        |
     |                               | 2. Extract code & 'next' param|                        |
     |                               | 3. exchangeCodeForSession(X)  |                        |
     |                               |------------------------------>|                        |
     |                               | 4. Returns session tokens     |                        |
     |                               |<------------------------------|                        |
     |                               | 5. Store session in HTTP-only |                        |
     |                               |    cookies via @supabase/ssr  |                        |
     | 6. Redirect 303 to /reset-pwd |                               |                        |
     |    (with Set-Cookie headers)  |                               |                        |
     |<------------------------------|                                                        |
     |                                                                                        |
     | 7. GET /reset-password (authenticated via session cookie)                              |
     |--------------------------------------------------------------------------------------->|
```

### 4.3 Open Redirect Protection & Sanitization
To prevent Open Redirect vulnerabilities (CWE-601), the route handler must rigorously validate the `next` query parameter. It must only accept relative paths starting with a single `/` and never double slashes `//` or external domains.

### 4.4 Technical Specification: `/src/app/auth/callback/route.ts`

```typescript
// frontend/src/app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'

  // Security: Prevent Open Redirect attacks
  // Ensure 'next' is a valid relative URL and does not begin with '//'
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/'
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Forward to the intended authenticated destination
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error('PKCE exchange error:', error.message)
      return NextResponse.redirect(
        `${origin}/login?message=${encodeURIComponent('Authentication link has expired or is invalid. Please try again.')}`
      )
    }
  }

  // Fallback if no code is present
  return NextResponse.redirect(
    `${origin}/login?message=${encodeURIComponent('Invalid authentication request. Missing authorization code.')}`
  )
}
```

---

## 5. Screen-by-Screen UX Flows & ASCII Wireframes

### 5.1 Flow 1: Unified Login & Registration Screen
The login screen is elevated into an intuitive, multi-modal interface utilizing Pather Saathi's Glassmorphism design system. Passengers can toggle between **Mobile OTP**, **Email & Password**, and **Magic Link**, or click **Continue with Google**.

#### ASCII Wireframe: Unified Authentication Modal
```
+-------------------------------------------------------------------------+
|                              PATHER SAATHI                              |
|                   Assam State Transit & Bus Booking                     |
+-------------------------------------------------------------------------+
|                                                                         |
|                 +-------------------------------------+                 |
|                 | [PHONE OTP] | Email/Pwd | MagicLink |  <-- Auth Mode  |
|                 +-------------------------------------+      Tabs       |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | [LOGIN]                             | [CREATE ACCOUNT]            |  |
|  +-------------------------------------------------------------------+  |
|  |                                                                   |  |
|  |   Mobile Number (India)                                           |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   | [IND +91 v] |  9 8 7 6 5   4 3 2 1 0                        | |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   We'll send a 6-digit verification code via SMS or WhatsApp      |  |
|  |                                                                   |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   |                >>>  GET OTP CODE  <<<                       | |  |
|  |   +-------------------------------------------------------------+ |  |
|  |                                                                   |  |
|  |   ------------------------- OR --------------------------------   |  |
|  |                                                                   |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   | [G] Continue with Google                                    | |  |
|  |   +-------------------------------------------------------------+ |  |
|  |                                                                   |  |
|  |   Need help? Contact support@pathersaathi.in                      |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|               [Lock Icon] Secure 256-Bit SSL Encryption                 |
+-------------------------------------------------------------------------+
```

#### Interaction Logic:
- **Phone Tab (Default)**: Numeric keypad on mobile (`inputMode="numeric"`). Auto-formats with `+91`.
- **Email Tab**: Shows Email and Password inputs. Features a prominent `"Forgot Password?"` link adjacent to the password label.
- **Magic Link Tab**: Shows single Email input and `"Send Login Link"`.
- **Google OAuth**: One-click social button triggering `signInWithOAuth({ provider: 'google' })`.

---

### 5.2 Flow 2: 6-Digit Mobile OTP Verification Screen
After submitting the phone number, the UI transitions to an auto-focusing 6-digit OTP entry screen with a 30-second cooldown timer.

#### ASCII Wireframe: OTP Verification
```
+-------------------------------------------------------------------------+
|                              PATHER SAATHI                              |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                      Verify Phone Number                          |  |
|  |                                                                   |  |
|  |   Code sent to: +91 98765 43210   [Edit / Change Number]          |  |
|  |                                                                   |  |
|  |   Enter 6-digit verification code:                                |  |
|  |                                                                   |  |
|  |   +-----+   +-----+   +-----+   +-----+   +-----+   +-----+       |  |
|  |   |  5  |   |  2  |   |  9  |   |  0  |   |  1  |   |  4  |       |  |
|  |   +-----+   +-----+   +-----+   +-----+   +-----+   +-----+       |  |
|  |                                                                   |  |
|  |   [!] Incorrect OTP. 2 attempts remaining. (Red alert if error)   |  |
|  |                                                                   |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   |                  VERIFY & CONTINUE                          | |  |
|  |   +-------------------------------------------------------------+ |  |
|  |                                                                   |  |
|  |   Didn't receive code?                                            |  |
|  |   - Resend OTP via SMS in: 00:24s (Disabled button)               |  |
|  |   - [Send via WhatsApp instead]                                   |  |
|  |                                                                   |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

#### Interaction Logic:
- **Auto-advance & Backspace**: Entering a digit in box `n` advances focus to box `n+1`. Backspace moves to `n-1`.
- **Clipboard Auto-fill**: Pasting a 6-digit string automatically populates all 6 inputs and submits the verification server action.
- **30s Throttle**: Prevents SMS flood abuse. Shows countdown. Once timer reaches zero, enables `"Resend SMS"` and `"Send via WhatsApp"`.

---

### 5.3 Flow 3: Forgot Password & Password Reset Screens

#### ASCII Wireframe 3A: Password Reset Request Form (`/forgot-password`)
```
+-------------------------------------------------------------------------+
|                              PATHER SAATHI                              |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                      Reset Your Password                          |  |
|  |                                                                   |  |
|  |   Enter the email address registered with your account. We will   |  |
|  |   send a secure password reset link to your inbox.                |  |
|  |                                                                   |  |
|  |   Email Address                                                   |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   | passenger@gmail.com                                         | |  |
|  |   +-------------------------------------------------------------+ |  |
|  |                                                                   |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   |              SEND PASSWORD RESET LINK                       | |  |
|  |   +-------------------------------------------------------------+ |  |
|  |                                                                   |  |
|  |   <-- Back to Login                                               |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

#### ASCII Wireframe 3B: Set New Password Form (`/reset-password`)
Accessed exclusively after the user clicks the verified recovery link via `/auth/callback?next=/reset-password`.

```
+-------------------------------------------------------------------------+
|                              PATHER SAATHI                              |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                      Create New Password                          |  |
|  |                                                                   |  |
|  |   Your identity has been verified. Enter your new password below. |  |
|  |                                                                   |  |
|  |   New Password (min. 8 characters)                                |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   | ••••••••••••••••                                      [Eye] | |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   [####--------] Password strength: Moderate                      |  |
|  |                                                                   |  |
|  |   Confirm New Password                                            |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   | ••••••••••••••••                                      [Eye] | |  |
|  |   +-------------------------------------------------------------+ |  |
|  |                                                                   |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   |                 UPDATE & SIGN IN                            | |  |
|  |   +-------------------------------------------------------------+ |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

### 5.4 Flow 4: Magic Link "Check Your Email" Confirmation

#### ASCII Wireframe: Magic Link Sent Confirmation
```
+-------------------------------------------------------------------------+
|                              PATHER SAATHI                              |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |  [Checkmark / Mail Icon]                                          |  |
|  |                       Check Your Email                            |  |
|  |                                                                   |  |
|  |   We've sent a magic sign-in link to:                             |  |
|  |   **passenger@example.com**                                       |  |
|  |                                                                   |  |
|  |   Click the link in the email to automatically sign in to your    |  |
|  |   account. The link will expire in 15 minutes.                    |  |
|  |                                                                   |  |
|  |   +-------------------------------------------------------------+ |  |
|  |   |             [Open Gmail]   /   [Open Outlook]               | |  |
|  |   +-------------------------------------------------------------+ |  |
|  |                                                                   |  |
|  |   Didn't get the email? Check your spam folder or                 |  |
|  |   [Resend Magic Link] (Available in 45s)                          |  |
|  |                                                                   |  |
|  |   <-- Back to Login                                               |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 6. Step-by-Step Technical Implementation Guide

### Step 1: PostgreSQL Migration DDL
Create migration file `supabase/migrations/20260914000001_auth_r4_phone_and_oauth.sql` containing the DDL defined in Section 3.2. Apply using Supabase CLI:
```bash
npx supabase migration apply
```

---

### Step 2: PKCE Route Handler Implementation
Create `frontend/src/app/auth/callback/route.ts` as specified in Section 4.4. This handles authorization codes for:
- Magic links: `redirectTo: ${origin}/auth/callback?next=/`
- Forgot password: `redirectTo: ${origin}/auth/callback?next=/reset-password`
- Google/Apple OAuth: `redirectTo: ${origin}/auth/callback?next=/`

---

### Step 3: SMS Gateway Setup (MSG91 via Supabase "Send SMS" Hook)

#### 3.1 Edge Function Implementation: `supabase/functions/sms-hook/index.ts`
Supabase Auth calls this Edge Function with a signed payload whenever an OTP must be transmitted.

```typescript
// supabase/functions/sms-hook/index.ts
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const SEND_SMS_HOOK_SECRET = Deno.env.get('SEND_SMS_HOOK_SECRET')?.replace('v1,whsec_', '')
const MSG91_AUTH_KEY = Deno.env.get('MSG91_AUTH_KEY')
const MSG91_TEMPLATE_ID = Deno.env.get('MSG91_OTP_TEMPLATE_ID')

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 })
  }

  if (!SEND_SMS_HOOK_SECRET || !MSG91_AUTH_KEY || !MSG91_TEMPLATE_ID) {
    console.error('Missing required SMS environment variables.')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers.entries())

    // 1. Verify Standard Webhooks signature from Supabase Auth
    const wh = new Webhook(SEND_SMS_HOOK_SECRET)
    const verified = wh.verify(payload, headers) as {
      user: { id: string; phone: string }
      sms: { otp: string }
    }

    const { user, sms } = verified
    const rawPhone = user.phone.replace('+', '') // MSG91 expects format 919876543210
    const otpCode = sms.otp

    // 2. Dispatch OTP via MSG91 SendOTP API
    const msg91Url = new URL('https://control.msg91.com/api/v5/otp')
    msg91Url.searchParams.set('template_id', MSG91_TEMPLATE_ID)
    msg91Url.searchParams.set('mobile', rawPhone)
    msg91Url.searchParams.set('otp', otpCode)

    const response = await fetch(msg91Url.toString(), {
      method: 'POST',
      headers: {
        'authkey': MSG91_AUTH_KEY,
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (!response.ok || result.type === 'error') {
      console.error('MSG91 dispatch failed:', result)
      return new Response(JSON.stringify({ error: 'Failed to deliver SMS via provider' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`Successfully dispatched OTP to ${user.phone}`)
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Webhook verification or execution failed:', err.message)
    return new Response(JSON.stringify({ error: 'Unauthorized or invalid webhook' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
```

#### 3.2 Supabase `config.toml` Hook Declaration
In `supabase/config.toml`:
```toml
[auth.sms]
enable_signup = true

[auth.hook.send_sms]
enabled = true
uri = "https://<project-ref>.supabase.co/functions/v1/sms-hook"
```

#### 3.3 Alternative Native Configuration (Textlocal)
If using native Textlocal instead of Edge Functions:
```toml
[auth.sms]
enable_signup = true

[auth.sms.textlocal]
api_key = "env(TEXTLOCAL_API_KEY)"
sender = "PATHRS"
```

---

### Step 4: Server Actions Implementation

Implement the server actions in `frontend/src/app/login/actions.ts` and `frontend/src/app/auth/actions.ts`:

```typescript
// frontend/src/app/login/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { normalizeIndianPhoneNumber } from '@/utils/phone'

/**
 * 1. Request Phone OTP
 */
export async function sendPhoneOtp(formData: FormData) {
  const phoneRaw = formData.get('phone_number') as string
  const validation = normalizeIndianPhoneNumber(phoneRaw)

  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone: validation.normalized,
    options: {
      channel: 'sms',
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, phone: validation.normalized }
}

/**
 * 2. Verify 6-digit Phone OTP
 */
export async function verifyPhoneOtp(phone: string, token: string) {
  if (!token || token.length !== 6) {
    return { success: false, error: 'Please enter a valid 6-digit OTP code.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * 3. Send Passwordless Magic Link
 */
export async function sendMagicLink(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  const headerList = await headers()
  const origin = headerList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/`,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * 4. Request Password Reset Link (Forgot Password)
 */
export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  const headerList = await headers()
  const origin = headerList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

/**
 * 5. Update Password (from /reset-password recovery session)
 */
export async function completePasswordReset(formData: FormData) {
  const newPassword = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' }
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' }
  }

  const supabase = await createClient()
  
  // Security verification: Ensure the user holds an active recovery or authenticated session
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, error: 'Session expired. Please request a new reset link.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
```

---

### Step 5: Social OAuth Setup & Configuration

#### 5.1 Google Cloud Console Setup
1. Navigate to [Google Cloud Console](https://console.cloud.google.com/) -> **APIs & Services** -> **Credentials**.
2. Create **OAuth 2.0 Client ID**:
   - Application Type: **Web application**
   - Name: `Pather Saathi Production`
   - Authorized JavaScript origins:
     - `https://pathersaathi.in`
     - `http://localhost:3000` (development)
   - Authorized redirect URIs:
     - `https://<supabase-project-id>.supabase.co/auth/v1/callback`
3. Retrieve **Client ID** and **Client Secret**.

#### 5.2 Supabase Dashboard OAuth Configuration
1. Go to **Authentication** -> **Providers** -> **Google**.
2. Toggle **Enable Google**.
3. Paste **Client ID** and **Client Secret**.
4. In **URL Configuration**, add `${NEXT_PUBLIC_SITE_URL}/auth/callback` to **Redirect URLs**.

#### 5.3 Client Trigger Implementation
In client component `frontend/src/app/login/LoginForm.tsx`:
```typescript
async function handleGoogleSignIn() {
  const supabase = createClient()
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=/`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })
}
```

---

### Step 6: Security Hardening & Rate Limiting (Upstash Redis)

SMS OTP endpoints are high-value targets for SMS Toll Fraud (where attackers script OTP requests to premium-rate numbers to drain startup credits). Strict rate limiting must be placed in front of `sendPhoneOtp`.

#### 6.1 Upstash Redis Rate Limiting Implementation
Using `@upstash/ratelimit` and `@upstash/redis`:

```typescript
// frontend/src/utils/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// 1. IP-based limiter: 5 OTP requests per IP per 10 minutes
export const ipOtpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  prefix: 'ratelimit:otp:ip',
})

// 2. Phone-based limiter: 3 OTP requests per phone number per 15 minutes
export const phoneOtpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '15 m'),
  prefix: 'ratelimit:otp:phone',
})

// 3. OTP verification brute-force protection: max 5 failed attempts per phone
export const verifyOtpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '5 m'),
  prefix: 'ratelimit:verify:phone',
})
```

#### 6.2 Enforcing Limiter in Server Action
```typescript
export async function sendPhoneOtpWithRateLimit(phone: string, clientIp: string) {
  // Check IP limit
  const ipResult = await ipOtpLimiter.limit(clientIp)
  if (!ipResult.success) {
    return { success: false, error: 'Too many requests from this network. Please try again later.' }
  }

  // Check Phone limit
  const phoneResult = await phoneOtpLimiter.limit(phone)
  if (!phoneResult.success) {
    return { success: false, error: 'Too many OTP requests for this number. Please wait 15 minutes.' }
  }

  // Proceed with Supabase signInWithOtp...
}
```

---

## 7. Testing, Verification & Rollout Plan

### 7.1 Automated & Manual Verification Matrix

| Test ID | Objective | Test Procedure | Expected Result | Invalidation Condition |
|---|---|---|---|---|
| **V-01** | Phone Signup DB Integrity | Call `supabase.auth.signInWithOtp` with test phone `+919876543210` and verify code `123456`. Query `SELECT * FROM public.users WHERE phone_number = '+919876543210'`. | Profile exists with `email IS NULL`, `role = 'customer'`, `name = 'Passenger 3210'`. | Constraint violation or missing row in `public.users`. |
| **V-02** | Owner Claim Trigger | Sign up with `support@pathersaathi.in`. Query `public.users` and `public.vehicles`. | User role is `operator`, `verification_status = 'verified'`, and orphan vehicles re-linked to `owner_id`. | User remains `customer` or vehicles not linked. |
| **V-03** | PKCE Callback Session Exchange | Invoke `/auth/callback?code=VALID_CODE&next=/profile`. | Returns HTTP 303 redirect to `/profile` with `sb-...-auth-token` HTTP-only cookies set. | 404 Not Found, redirect loop, or no cookies written. |
| **V-04** | Open Redirect Defense | Invoke `/auth/callback?code=VALID_CODE&next=https://malicious-site.com` and `next=//evil.com`. | Request sanitizes `next` and redirects safely to `/`. | Redirects to external domain. |
| **V-05** | Password Recovery Flow | Submit email to `requestPasswordReset`. Click link from inbox. Update password on `/reset-password`. Log out and log in with new password. | Successfully authenticates with new password. | "Auth session missing" error or password remains unchanged. |
| **V-06** | Rate Limiting Enforcement | Script 6 consecutive OTP requests within 60 seconds to `+919876543210`. | 6th request rejected with HTTP 429 / "Too many OTP requests". | All 6 requests succeed, allowing SMS flooding. |

### 7.2 Zero-Code Rollout Phasing

```
+-------------------------------------------------------------------------+
| PHASE 1: Database Migration & PKCE Infrastructure                       |
| - Deploy 20260914000001_auth_r4_phone_and_oauth.sql                     |
| - Create /frontend/src/app/auth/callback/route.ts                       |
| - Test using local Supabase CLI test phone credentials                  |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 2: Password Recovery & Magic Links                                |
| - Implement /forgot-password & /reset-password UI pages                 |
| - Configure Supabase Email templates with /auth/callback?next=...       |
| - Verify session cookie exchange and password updates                   |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 3: Indian SMS Gateway & Phone OTP                                 |
| - Complete TRAI DLT registration (Header: PATHRS)                       |
| - Deploy sms-hook Supabase Edge Function with MSG91 API                 |
| - Mount phone OTP UI and 6-digit verification modal                     |
| - Deploy Upstash Redis rate limiting on OTP actions                     |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
| PHASE 4: Social OAuth Deployment                                        |
| - Register Google Cloud Console Web Application credentials             |
| - Enable Google provider in Supabase Dashboard                          |
| - Test full OAuth redirect cycle through PKCE handler                   |
+-------------------------------------------------------------------------+
```

---
*End of Authoritative Authentication & Security Architecture Plan.*
