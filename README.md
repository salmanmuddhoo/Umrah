# Rihla — Umrah marketplace

A web app where pilgrims book Umrah packages and transport, learn how to perform Umrah, and talk to each other. Umrah operators and transport companies each get a back office to manage their listings and bookings, and the platform earns a commission on every confirmed booking.

"Rihla" is a placeholder name — change it in `src/components/Header.tsx` and `src/app/layout.tsx`.

## What is in it

| Area | Path | Who |
| --- | --- | --- |
| Browse and book Umrah packages | `/packages` | Everyone (sign in to book) |
| Browse and book transport | `/transport` | Everyone (sign in to book) |
| Step-by-step Umrah guide | `/guide` | Everyone |
| Reddit-style community (topics, votes, threaded comments) | `/community` | Everyone (sign in to post) |
| My bookings | `/bookings` | Signed-in users |
| Provider back office: listings, bookings, earnings, profile | `/dashboard` | Umrah and transport providers |
| Platform back office: revenue, provider approval, commission rates | `/admin` | Admin |
| Provider sign-up | `/partners` | Everyone |

### How the money works

- Listing is free. The platform takes a percentage of each booking (default 8% for packages, 10% for transport), editable at `/admin/settings`.
- The commission is fixed on the booking when it is made, so later rate changes never alter existing bookings.
- Only confirmed and completed bookings count as revenue. `/admin` shows the total and what each provider owes.
- **No online payment is taken yet.** A booking is a request; the provider confirms it and collects payment directly. Adding a payment gateway (so the platform collects the money and pays providers out minus commission) is the natural next step.

### Booking lifecycle

`PENDING` → provider confirms → `CONFIRMED` → `COMPLETED`. The pilgrim or the provider can cancel a pending or confirmed booking; cancelled package bookings release their seats.

New providers start as `PENDING` and their listings stay hidden until an admin approves them.

## Run it locally

Requires Node 20+.

```bash
npm install
cp .env.example .env     # then set AUTH_SECRET to a long random string
npm run setup            # creates the SQLite database and loads demo data
npm run dev
```

Demo accounts (password `password123`):

| Email | Role |
| --- | --- |
| `admin@example.com` | Platform admin |
| `provider@example.com` | Umrah provider |
| `transport@example.com` | Transport provider |
| `pilgrim@example.com` | Pilgrim |

There is no admin sign-up screen. `npm run db:seed` creates the demo admin; for a real deployment, set a user's `role` to `ADMIN` in the database.

## Tech

- Next.js 16 (App Router, server components and server actions), React 19, Tailwind CSS 4
- Prisma with SQLite for development — schema in `prisma/schema.prisma`
- Sessions are a signed, HTTP-only cookie (`src/lib/auth.ts`); passwords are hashed with bcrypt

```
src/app/            pages; src/app/actions/ holds every data-changing server action
src/lib/            database client, auth, commission settings, guide content
src/components/     shared UI
prisma/             schema and demo seed
```

## Before going live

- Move to PostgreSQL: change `provider` in `prisma/schema.prisma` and `DATABASE_URL`, and switch from `db push` to Prisma migrations.
- Set a strong `AUTH_SECRET` (the app refuses to start sessions in production without one).
- Add online payments, email notifications for booking events, password reset and email verification.
- Add rate limiting on sign-in and posting, and reporting tools for the community.
- Have the Umrah guide reviewed by a qualified scholar.
