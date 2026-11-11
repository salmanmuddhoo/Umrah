# My Ummah

A mobile app (Android and iOS) where pilgrims book Umrah packages and transport, learn how to perform Umrah, and talk to each other. Umrah operators and transport companies manage their listings and bookings inside the same app. The platform earns a commission on every confirmed booking.

```
mobile/   The app — React Native (Expo), one codebase for Android and iOS
server/   The API the app talks to, plus the platform owner's admin console (web)
```

## What the app does

| Tab / area | What is in it | Who |
| --- | --- | --- |
| Packages | Search, filter and book Umrah packages; seats are tracked so a package cannot be oversold | Everyone (sign in to book) |
| Transport | Book airport transfers, intercity rides and ziyarah tours | Everyone (sign in to book) |
| Guide | Ihram, tawaf, sa'i and halq step by step, with duas in Arabic, transliteration and meaning. Bundled in the app, so it works offline | Everyone |
| Community | Topics, posts, up/down votes and threaded replies | Everyone (sign in to post) |
| Account → My bookings | Track and cancel bookings | Signed-in users |
| Account → Provider dashboard | Earnings, listings (create / edit / hide), incoming bookings (confirm / decline / complete), company profile | Umrah and transport providers |

The platform owner's back office is a small web console served by `server/` at `/admin`: revenue, commission owed per provider, approving or suspending providers, and setting commission rates.

### How the money works

- Listing is free. The platform takes a percentage of each booking (default 8% for packages, 10% for transport), editable in the admin console.
- The commission is fixed on the booking when it is made, so later rate changes never alter existing bookings.
- Only confirmed and completed bookings count as revenue.
- **No online payment is taken yet.** A booking is a request; the provider confirms it and collects payment directly, and the admin console shows what each provider owes. Taking payment in the app is the natural next step.

New providers start as pending, and their listings stay hidden until an admin approves them.

## Run it

Requires Node 20+.

**1. Server**

```bash
cd server
npm install
cp .env.example .env     # then set AUTH_SECRET to a long random string
npm run setup            # creates the SQLite database and loads demo data
npm run dev              # API on http://localhost:3000/api/v1, admin console on /admin
```

**2. App**

```bash
cd mobile
npm install
cp .env.example .env     # point EXPO_PUBLIC_API_URL at the server
npx expo start           # press a for Android, i for iOS, or scan the QR code with Expo Go
```

Demo accounts (password `password123`):

| Email | Role |
| --- | --- |
| `pilgrim@example.com` | Pilgrim |
| `provider@example.com` | Umrah provider |
| `transport@example.com` | Transport provider |
| `admin@example.com` | Platform admin (web console only) |

## Tests

```bash
cd server && npm test    # 110 tests: business rules, validation, API routing, and every service against a throwaway SQLite database
cd mobile && npm test    # 107 tests: API client, validation, formatting, comment threading, sign-in state, components, login screen
```

Both suites, plus lint and type checks, run on every push through GitHub Actions (`.github/workflows/ci.yml`).

## Building for the stores

Builds use [EAS](https://docs.expo.dev/build/introduction/), which needs a free Expo account:

```bash
cd mobile
npx eas-cli build --platform android --profile preview      # installable .apk for testing
npx eas-cli build --platform android --profile production   # .aab for Google Play
npx eas-cli build --platform ios --profile production       # needs an Apple Developer account
```

Before a store build, set `EXPO_PUBLIC_API_URL` to your deployed HTTPS server and change the app identifier `com.myummah.app` in `mobile/app.json` if you want a different one.

## Before going live

- Deploy the server with PostgreSQL: change `provider` in `server/prisma/schema.prisma` and `DATABASE_URL`, and switch from `db push` to Prisma migrations.
- Set a strong `AUTH_SECRET` (the server refuses to issue sessions in production without one).
- Add online payments, push/email notifications for booking events, password reset and email verification.
- Add rate limiting on sign-in and posting, and reporting tools for the community (both app stores require a way to report and block user content).
- Replace the typed date and time fields with native pickers.
- Have the Umrah guide reviewed by a qualified scholar.
- There is no admin sign-up. `npm run db:seed` creates the demo admin; for a real deployment set a user's `role` to `ADMIN` in the database.
