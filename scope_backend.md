# Backend Development Scope

## Overview
The backend of Pather Saathi provides the core business logic, API endpoints, and acts as the intermediary between the Next.js frontend and the Supabase PostgreSQL database. It is built using FastAPI for high performance and rapid development.

## Tech Stack
- **Framework:** Python + FastAPI
- **Server:** Uvicorn
- **Database Client:** Supabase Python Client (or asyncpg)
- **Deployment:** Vercel (or Render/Railway depending on preference)

## Key Responsibilities

### 1. API Endpoints
- **`/routes/vehicles.py`**:
  - `GET /vehicles`: List all vehicles (with optional filtering by type, availability).
  - `GET /vehicles/{id}`: Get specific vehicle details.
  - `POST /vehicles`: Add a new vehicle (Owner only).
  - `PUT /vehicles/{id}`: Update vehicle specs or availability (Owner only).
  - `DELETE /vehicles/{id}`: Remove a vehicle (Owner only).
  
- **`/routes/bookings.py`**:
  - `POST /bookings`: Create a new booking request (Customer).
  - `GET /bookings`: List bookings (Customer sees their own, Owners see all pending for their fleet).
  - `PATCH /bookings/{id}/status`: Approve or reject a booking (Owner only).

- **`/routes/users.py`**:
  - Optional wrappers around Supabase Auth, or logic to sync Supabase Auth users to the `USERS` table.
  - Role verification endpoints.

### 2. Authentication & Authorization
- Validate Supabase JWT tokens on protected routes.
- Enforce Role-Based Access Control (RBAC): Ensure customers cannot modify vehicles and cannot approve their own bookings.

### 3. Business Logic
- Check for scheduling conflicts (e.g., ensuring a vehicle isn't booked twice on the same date).
- Calculate total pricing based on the vehicle's `price_per_day` and the duration of the booking.
