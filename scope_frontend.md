# Frontend Development Scope

## Overview
The frontend of Pather Saathi is built using Next.js and Tailwind CSS. It serves two primary user roles: Customers (booking vehicles/buses) and Business Owners (managing fleets and bookings).

## Tech Stack
- **Framework:** Next.js (App Router recommended)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

## Key Pages & Features

### 1. Public Pages
- **Home Page:** Landing page introducing AKN Construction and Shivam Coach services.
- **Vehicle Catalog:** Listing page for all available vehicles with filters for type (bus, excavator, truck, loader).
- **Vehicle Details:** Specific page for a vehicle showing specs, price per day, and a "Book Now" CTA.

### 2. Customer Portal
- **Dashboard:** Overview of active and past bookings.
- **Booking Flow:** Form to select start/end dates and submit a booking request.

### 3. Owner Portal (AKN Construction & Shivam Coach)
- **Dashboard:** Overview of fleet status and pending booking requests.
- **Fleet Management:** Add, edit, or remove vehicles. Update availability.
- **Booking Management:** Approve or reject pending customer bookings.

## Integration Points
- **API Communication:** Fetching and mutating data via the FastAPI backend (`/routes`).
- **State Management:** React Context or a lightweight library (Zustand) for managing user sessions and UI state.
