# Work Distribution & Integration Plan

**Goal:** Ensure a smooth, parallel development process for the 3-person team while strictly limiting the project scope to avoid feature creep and future integration problems.

## 1. Scope Definition (Strict Limits)

To finish this micro-project successfully, we must stick strictly to the defined scope. Any new features must be deferred until the core is fully functional.

### What is IN Scope:
- **Database:** Only 3 tables (`USERS`, `VEHICLES`, `BOOKINGS`).
- **Backend:** Basic CRUD operations (Create, Read, Update, Delete) for vehicles and bookings. Simple authentication (customer vs. owner).
- **Frontend:** 
  - Landing Page (Browse vehicles).
  - Customer View (Request booking, view booking status).
  - Owner View (Add/Edit vehicles, approve/reject bookings).

### What is OUT of Scope (Do NOT build these initially):
- Payment gateway integration.
- Live GPS tracking of vehicles.
- Complex user profiles or reviews/ratings.
- Email/SMS notifications (use simple UI alerts instead).

---

## 2. Team Work Distribution (3 Members)

To avoid stepping on each other's toes and causing merge conflicts, work is divided by **domain-specific ownership** with clear API contracts in between.

### Subinoy Nath: Frontend (Next.js + Tailwind CSS)
**Focus:** User Interface, User Experience, and connecting to the backend.
- **Tasks:**
  - Setup the Next.js project with Tailwind CSS.
  - Build reusable UI components (Navbar, Buttons, Vehicle Cards, Modals).
  - Build the public **Landing Page** and **Vehicle Listing Page**.
  - Build the **Booking Request Form** UI and **Customer Dashboard**.
  - Build the **Owner Dashboard** (Add/Edit vehicles, approve/reject bookings).
  - Integrate all frontend pages with the backend API endpoints using `fetch()`.
- **Deliverable:** A fully responsive frontend application connected to the FastAPI backend.

### Biswajyoti Nath: Backend (Python + FastAPI)
**Focus:** Business Logic, API Endpoints, and Authentication.
- **Tasks:**
  - Setup the FastAPI base project structure (`main.py`, router setup).
  - Implement basic Authentication (Role checking for `customer` vs `owner`).
  - Build endpoints for **Vehicles** (`GET /vehicles`, `POST /vehicles`, etc.).
  - Build endpoints for **Bookings** (`POST /bookings`, `PATCH /bookings/{id}/status`).
  - Integrate with the Database using a Python ORM or raw SQL to execute operations.
- **Deliverable:** A running FastAPI server with secure endpoints and an accessible Swagger UI (`/docs`) serving as the API contract.

### Dipjyoti Roy: Database (Supabase / PostgreSQL)
**Focus:** Database Schema, Data Integrity, and Seed Data.
- **Tasks:**
  - Create the Supabase project and manage access credentials.
  - Design and run the SQL for the 3 core tables (`USERS`, `VEHICLES`, `BOOKINGS`).
  - Set up necessary constraints, foreign keys, and indexes to ensure data integrity.
  - (Optional but recommended) Set up Row Level Security (RLS) policies in Supabase if needed.
  - Provide initial seed data (mock users, mock vehicles) so the backend and frontend can test effectively.
- **Deliverable:** A fully configured, live PostgreSQL database and a set of raw SQL migration/schema files committed to the repo.

---

## 3. Strategies to Prevent Integration Problems

The biggest risk in a team separated by domains is integration failure. Follow these rules:

1. **API Contracts First:**
   *Before* anyone writes Python or React code, Biswajyoti and Subinoy must agree on the exact JSON request/response formats. 
2. **Use Swagger/OpenAPI:**
   FastAPI automatically generates documentation at `http://localhost:8000/docs`. Subinoy must use this to understand how to call Biswajyoti's API.
3. **Frontend Mocking:**
   While the backend is being built, Subinoy should use hardcoded JSON files or state to build the UI. Do not wait for the backend to be finished to start frontend work.
4. **Environment Variables:**
   Keep `.env.local` clean. If Dipjyoti or Biswajyoti adds a new environment variable (like a Supabase Key or API URL), they must immediately announce it to the team and update `.env.local.example`.
5. **No Cross-Domain Commits:**
   Keep pull requests/commits focused on one domain. Subinoy works in `/frontend`, Biswajyoti works in `/backend`, and Dipjyoti can maintain a `/database` folder for schema SQL files.
