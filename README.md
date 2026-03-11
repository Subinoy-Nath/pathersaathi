# পথের সাথী — Pather Saathi

> Fleet management and trip booking platform for local businesses in Barak Valley, Assam, India.

## About

Pather Saathi connects customers with two local fleet operators:

- **AKN Construction** — Excavators, dump trucks, loaders
- **Shivam Coach** — Bus services

Customers can browse vehicles, request bookings, and track their status. Business owners can manage their fleet, set availability, and approve or reject bookings.

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | Next.js + Tailwind CSS            |
| Backend  | Python + FastAPI                  |
| Database | PostgreSQL (Supabase)             |
| Hosting  | Vercel (frontend), Supabase (API) |

## Database Schema

```
USERS     — id, name, email, password_hash, role (customer | owner), created_at
VEHICLES  — id, owner_id, name, type (bus | excavator | truck | loader), price_per_day, is_available, image_url
BOOKINGS  — id, vehicle_id, customer_id, start_date, end_date, status (pending | approved | rejected), created_at
```

## Project Structure

```
/
├── frontend/          # Next.js app
│   ├── app/
│   │   └── api/       # Next.js API routes
│   └── components/    # Reusable UI components
├── backend/           # FastAPI app
│   └── routes/        # FastAPI route handlers
├── LOGBOOK.md         # Session-by-session dev log
└── README.md
```

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials. Never commit `.env.local`.

## Conventions

- Components in `/components`
- API routes in `/app/api` (Next.js) or `/routes` (FastAPI)
- Env vars via `.env.local` — never committed
- Commits in lowercase imperative: `add vehicle listing page`
- `LOGBOOK.md` updated after every session

## Team

Built by 4 students at Assam Science and Technology University (ASTU) as a micro project, using AI tooling as the primary development workflow.

## License

MIT
