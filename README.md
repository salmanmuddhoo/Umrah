# My Ummah

A mobile app (Android and iOS) where pilgrims book Umrah packages and transport, learn how to perform Umrah, and talk to each other. Umrah operators and transport companies manage their listings and bookings inside the same app. The platform earns a commission on every confirmed booking.

```
mobile/   The app — React Native (Expo), one codebase for Android and iOS
server/   The API the app talks to, plus the platform owner's admin console (web)
```

## What the app does

| Tab / area | What is in it | Who |
| --- | --- | --- |
| Home | Today's date in the Hijri and Gregorian calendars, a rotating banner of sponsored cards from suppliers, shortcut cards to every service, and the next departures | Everyone |
| Umrah → Packages | Search, filter and book Umrah packages; seats are tracked so a package cannot be oversold | Everyone (sign in to book) |
| Umrah → Transport | Book airport transfers, intercity rides and ziyarah tours | Everyone (sign in to book) |
| Umrah → How to perform | Ihram, tawaf, sa'i and halq step by step, with duas in Arabic, transliteration and meaning. Bundled in the app, so it works offline | Everyone |
| Umrah → Visa | Each type of visa with its cost, how to apply step by step, and links to the official Saudi sources | Everyone |
| Umrah → Zamzam | Where to buy Zamzam water at Jeddah and Madinah airports, what it costs, and the rules for taking it home | Everyone |
| Umrah → Planner | A personal trip plan: dates, travellers, notes, a countdown, and a checklist for every stage of the trip that starts pre-filled and can be ticked, added to and trimmed | Signed-in users |
| Community | Topics, posts, up/down votes and threaded replies | Everyone (sign in to post) |
| Account → Sign in / sign up | Email address or phone number → 6-digit code (by email, or WhatsApp for phone numbers) → choose a 4-digit PIN. The PIN is asked for every time the app is opened | Everyone |
| Account → My bookings | Track and cancel bookings | Signed-in users |
| Account → Become a service provider | One button for every kind of provider: choose the service you offer (Umrah packages, transport, hotels, catering, guides, other), then give your company details | Everyone |
| Account → Provider dashboard | Earnings, listings (create / edit / hide), incoming bookings (confirm / decline / complete), company profile | Approved providers |

The app uses light grey surfaces with an indigo accent (set in `mobile/src/theme.ts`; the admin console matches). Cards and sections animate in, lists load behind pulsing placeholders, banners have slowly drifting shapes, progress bars fill, buttons respond to touch, and the ad banner rotates on its own. All motion switches off when the phone is set to reduce motion.

### Adding a new kind of service provider

Add one line to `PROVIDER_TYPES` in `server/src/lib/constants.ts` and the matching line in `mobile/src/lib/constants.ts`. It then appears on the "Become a service provider" screen and in the admin console. Only Umrah-package and transport providers have listing and booking tools so far; other kinds can apply, be approved and keep a company profile, and see a "coming soon" note where their listings will be.

### Prices shown in the guides

The Zamzam price and the cost of each visa type are short pieces of text you edit in the admin console under **Guide prices**, together with the "last checked" date readers see. The app fetches them when it opens and falls back to the values bundled with it when offline. The bundled defaults were checked against public sources in November 2026.

### Hijri dates

The app uses the phone's own Umm al-Qura calendar (the one Saudi Arabia publishes). On a phone without it, an arithmetic Islamic calendar is used instead, which can be a day out. The real start of a month depends on the moon being sighted, so treat the date as a guide.

The platform owner's back office is a small web console served by `server/` at `/admin`: revenue, commission owed per provider, approving or suspending providers, setting commission rates, editing the prices quoted in the guides, and managing the Home tab's advertising.

### How the money works

- Listing is free. The platform takes a percentage of each booking (default 8% for packages, 10% for transport), editable in the admin console.
- The commission is fixed on the booking when it is made, so later rate changes never alter existing bookings.
- Only confirmed and completed bookings count as revenue.
- **Advertising** is a second income stream. In the admin console (`/admin/ads`) you create a sponsored card for a supplier — headline, text, colour, optional start and end dates, and the package or transport service it opens. Up to 10 rotate on the app's Home tab, each marked “Sponsored”, and the console shows how many taps each has had. What you charge is agreed with the supplier outside the app.
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

Demo accounts — in the app, enter one of these, then the code, then PIN `1234`:

| Sign in with | Role |
| --- | --- |
| `pilgrim@example.com` | Pilgrim |
| `+447700900456` | Pilgrim who signed up by phone |
| `provider@example.com` | Umrah provider |
| `transport@example.com` | Transport provider |

The web admin console at `/admin` uses `admin@example.com` / `password123`.

### Verification codes

On a development server with no email or WhatsApp provider configured, nothing is sent: the app shows the code on screen and the server prints it to its log. In production the server refuses to issue codes for a channel until that channel is configured in `server/.env`:

| Channel | Provider | Settings |
| --- | --- | --- |
| Email | [Resend](https://resend.com) | `RESEND_API_KEY`, `EMAIL_FROM` |
| WhatsApp | Meta WhatsApp Cloud API | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE` (an approved *authentication* template with a copy-code button), `WHATSAPP_TEMPLATE_LANG`, `WHATSAPP_API_VERSION` |

How sign-in is protected:

- Codes are 6 digits, last 10 minutes, work once, and stop being accepted after 5 wrong guesses. A new code can be requested every 30 seconds, at most 5 an hour.
- The PIN is checked by the server and stored only as a hash. After 5 wrong PINs in a row it stops working — even if then entered correctly — until it is reset with a fresh verification code.
- Signing in on a new device needs both a code and the PIN. The app asks for the PIN again on every launch and after 2 minutes in the background.

## Tests

```bash
cd server && npm test    # 186 tests: business rules, validation, API routing, sign-in (codes, PINs, lockout), advertising, provider applications, the planner, guide prices, and every service against a throwaway SQLite database
cd mobile && npm test    # 232 tests: API client, validation, formatting, the Hijri calendar, sign-in flow, PIN pad, app lock, Home, ad banner, animations, guides and prices, planner, provider application
```

Both suites, plus lint and type checks, run on every pull request and on `production` through GitHub Actions (`.github/workflows/ci.yml`).

## Releasing the Android app

The `production` branch is the release branch. Merging into it runs `.github/workflows/android-release.yml`, which tests the app, compiles it and attaches the result to the workflow run under **Actions → Android release → Artifacts**:

- an `.aab` to upload to Google Play
- an `.apk` you can install straight onto a phone

Pull requests into `production` get a quicker verification build, so a change that breaks the Android build is caught before it is merged.

**One-time setup** (repository **Settings → Secrets and variables → Actions**). A release build fails until these exist:

1. Create an upload keystore and keep it somewhere safe — Google Play ties your app to it:

   ```bash
   keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
     -keystore upload.jks -alias upload
   base64 -w0 upload.jks     # macOS: base64 -i upload.jks
   ```

2. Add these **secrets**:

   | Secret | Value |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | the base64 text from the command above |
   | `ANDROID_KEYSTORE_PASSWORD` | the keystore password you chose |
   | `ANDROID_KEY_ALIAS` | `upload` |
   | `ANDROID_KEY_PASSWORD` | the key password you chose |

3. Add this **variable**: `API_URL` = the `https://` address of your deployed server.

The version shown to users comes from `version` in `mobile/app.json`; the Play Store build number is the workflow run number, so it rises on its own. The app identifier is `com.myummah.app` (`mobile/app.json`) — change it before the first Play upload if you want a different one, because it cannot be changed afterwards.

### iOS

iOS builds need a Mac and an Apple Developer account, so they are not part of this workflow. With an Expo account, `npx eas-cli build --platform ios --profile production` (run from `mobile/`) builds in Expo's cloud.

## Before going live

- Deploy the server with PostgreSQL: change `provider` in `server/prisma/schema.prisma` and `DATABASE_URL`, and switch from `db push` to Prisma migrations.
- Set a strong `AUTH_SECRET` (the server refuses to issue sessions in production without one).
- Configure Resend and/or the WhatsApp Cloud API so verification codes are actually delivered (see above). Neither has been exercised against the real service yet.
- Add online payments and push/email notifications for booking events.
- Add per-IP rate limiting in front of the API (codes and PINs are already limited per account) and limits on posting, and reporting tools for the community (both app stores require a way to report and block user content).
- Replace the typed date and time fields with native pickers.
- Have the Umrah guide reviewed by a qualified scholar, and re-check the visa guide (`mobile/src/lib/visa.ts`), the Zamzam guide (`mobile/src/lib/zamzam.ts`) and the guide prices against the official Saudi sources — entry rules and fees change often, and the guides show their last-checked date to readers.
- There is no admin sign-up. `npm run db:seed` creates the demo admin; for a real deployment create a user in the database with `role` `ADMIN`, an `email`, and a bcrypt `passwordHash`.
