# EV Charge — driver web app

A driver-facing web front end for the OCPP 1.6J Central System (CSMS) that lives in
`../evChargerBack`. Drivers use it to find a charge point, see live plug availability and
tariffs, keep an account, link their RFID charge tags, and review their charging sessions.

It is a Next.js 16 App Router project: React 19, TypeScript in strict mode, Tailwind CSS v4
(theme tokens only, no `tailwind.config` file), and no UI framework beyond a small in-repo
component kit.

**This app is not the operator console.** It has no admin screens, it never writes charge point
configuration, and it holds no operator credentials in the browser. The CSMS is reached only from
the Next.js server.

---

## Table of contents

1. [What this is](#1-what-this-is)
2. [Quick start](#2-quick-start)
3. [Architecture](#3-architecture)
4. [Configuration](#4-configuration)
5. [Connecting real email and SMS](#5-connecting-real-email-and-sms)
6. [Connecting the CSMS](#6-connecting-the-csms)
7. [Station metadata convention](#7-station-metadata-convention)
8. [Routes](#8-routes)
9. [Auth model](#9-auth-model)
10. [Deployment notes](#10-deployment-notes)
11. [Known gaps and next steps](#11-known-gaps-and-next-steps)

---

## 1. What this is

| | |
| --- | --- |
| Audience | EV drivers, on a phone, usually outdoors and in a hurry |
| Backend | The OCPP 1.6J CSMS in `../evChargerBack`, over its REST API |
| Framework | Next.js 16.3 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 with CSS custom properties; light and dark themes |
| Accounts | MongoDB (its own collections), with a JSON file store for development |
| Sessions | Signed HttpOnly cookie (JWT via `jose`); no third-party auth service |

What it does:

- Lists every charge point published by the CSMS with live connector status, filters by plug
  type, minimum power and availability, and sorts by distance when the driver shares location.
- Shows one charge point in detail: address, directions, tariff, per-connector state.
- Registers drivers, verifies email and phone, resets forgotten passwords by emailed link or by
  SMS one-time code.
- Links RFID charge tag identifiers to an account, and lists the charging sessions recorded
  against those tags.
- Optionally starts and stops a session remotely, when the operator enables it.

- Keeps a prepaid wallet: tops it up with QPay (preset amounts or a freely typed one), shows the
  balance and the full ledger, and lets charging sessions settle against it automatically.

What it deliberately does not do: manage charge points, or expose anything about the CSMS to the
browser. It holds no card details either — money is only ever taken by QPay, in the driver's own
banking app.

---

## 2. Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open <http://localhost:3100>. (Port 3100, not 3000 — 3000 is the CSMS.)

**It runs with nothing else installed.** No MongoDB, no CSMS, no mail server, no SMS gateway:

| Missing dependency | What happens instead |
| --- | --- |
| CSMS unreachable | `DEMO_DATA=true` serves the built-in sample network from `src/lib/csms/demo-data.ts`. Every list and detail page carries a visible "sample data" notice. |
| MongoDB unreachable or `MONGODB_URI` empty | `ALLOW_FILE_STORE=true` keeps driver accounts in `.data/driver-accounts.json`. Never used when `NODE_ENV=production`. |
| No mail server | `EMAIL_PROVIDER=console` prints the whole message to the server log and appends it to `.data/outbox.log`. |
| No SMS gateway | `SMS_PROVIDER=console` does the same for text messages. |

So the password-reset and verification flows are fully clickable on a laptop with nothing running
but `npm run dev`: **the reset link and the six-digit code are printed to the terminal and to
`.data/outbox.log`.** With `DEV_EXPOSE_TOKENS=true` they are also returned in the API response
(`devToken` / `devCode`) so a form can jump straight to the next step. `.data/` is git-ignored.

Other scripts:

```bash
npm run build      # production build
npm start          # serve the build, also on port 3100
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

---

## 3. Architecture

```
   +---------------------------------------------------------------+
   |  Browser — React 19 client components                          |
   |  station list and map, forms, start/stop buttons               |
   +------------------------------+--------------------------------+
                                  |
                                  |  fetch() to THIS app only
                                  |  (same origin, cookie session)
                                  v
   +---------------------------------------------------------------+
   |  Next.js 16 server  —  this app, port 3100                     |
   |                                                                |
   |   src/app/**/page.tsx       server components, per request     |
   |   src/app/app-api/**/route.ts  the app's own JSON API          |
   |   src/middleware.ts         edge redirect guard                |
   |                                                                |
   |   src/lib/csms/*   src/lib/db/*   src/lib/auth/*               |
   |   src/lib/notify/*  <- SMTP / Twilio / HTTP gateway            |
   +----------+----------------------------------+-----------------+
              |                                  |
              | HTTPS, x-api-key or Bearer JWT   | mongodb://
              v                                  v
   +-----------------------------+   +---------------------------+
   |  CSMS REST API              |   |  MongoDB                  |
   |  ../evChargerBack, :3000    |   |  driverusers              |
   |  /api/charge-points         |   |  driververificationtokens |
   |  /api/transactions          |   +---------------------------+
   +--------------+--------------+
                  |
                  |  OCPP 1.6J, JSON over WebSocket
                  v
        +-------------------------+
        |  Charge points          |
        +-------------------------+
```

### Security rule

**CSMS credentials and the driver account store are server-only. The browser never talks to the
CSMS, and never sees a CSMS token.** Every client component calls this app's own `/app-api/*` routes;
those handlers authenticate the cookie session, decide what this particular driver may see, and
only then call `@/lib/csms/*`. Nothing under `@/lib/db`, `@/lib/csms` or `@/lib/notify` may be
imported from a `'use client'` file or from `middleware.ts` — `src/lib/auth/edge-session.ts`
exists precisely so the middleware can check a cookie signature without touching Mongo.

### Module map

| Module | Owns |
| --- | --- |
| `src/lib/types.ts` | Domain types shared by server and browser: `Station`, `StationConnector`, `ChargingSession`, `PublicUser`, `ConnectorStatus`, `ConnectorType`. |
| `src/lib/utils.ts` | Pure formatting and geo helpers — `formatKwh`, `formatPower`, `formatMoney`, `formatDateTime`, `formatDuration`, `haversineKm`, status labels and tones. Safe in client components. |
| `src/lib/env.ts` | All configuration reading. `serverEnv` is lazy getters for secrets; `publicEnv` holds only `NEXT_PUBLIC_*` values. `requireSessionSecret()` fails fast in production. |
| `src/lib/api.ts` | Route-handler plumbing: `route()` wrapper turning thrown errors into the single `{ error, fields? }` envelope, `parseBody`/`parseQuery`, `requireUser`, `guard` (rate limit), and the `ApiError` constructors. |
| `src/lib/validation.ts` | Every zod schema, `normalizePhone()` (local number to E.164), `fieldErrors()` (ZodError to `{ field: message }`). |
| `src/lib/auth/session.ts` | Issues, verifies and clears the session cookie; `getCurrentUser()` re-reads the account on every request; `toPublicUser()` strips secrets. |
| `src/lib/auth/edge-session.ts` | Signature-only cookie check for `middleware.ts` (Edge runtime, no database). |
| `src/lib/auth/password.ts` | bcrypt hash/verify at 12 rounds, plus a cheap strength meter for the sign-up form. |
| `src/lib/auth/tokens.ts` | Link secrets and 6-digit OTPs, SHA-256 hashing, constant-time comparison, `<tokenId>.<secret>` link format, TTLs. |
| `src/lib/auth/rate-limit.ts` | In-memory fixed-window limiter and best-effort client IP. Single process only. |
| `src/lib/db/index.ts` | Chooses the store once per process: Mongo when reachable, otherwise the JSON dev store. |
| `src/lib/db/mongoose.ts`, `mongo-store.ts`, `models.ts` | Mongo connection and the `driverusers` / `driververificationtokens` collections. |
| `src/lib/db/file-store.ts` | The same `UserStore` interface backed by `.data/driver-accounts.json`. |
| `src/lib/db/types.ts` | `StoredUser`, `StoredToken` and the `UserStore` contract both stores implement. |
| `src/lib/i18n/config.ts` | Supported locales (`mn` default, `en` fallback), the `evapp_locale` cookie name and label map. |
| `src/lib/i18n/dictionaries.ts` | All translated copy. `en` defines the shape; TypeScript makes `mn` provide every key. |
| `src/lib/i18n/index.ts` | Server side of the translation layer: `getLocale()`, `getDictionary()`, `getTranslations()` and `format()` for `{placeholder}` interpolation. |
| `src/lib/notify/email.ts` | `sendEmail()` — `console` or `smtp` provider. |
| `src/lib/notify/sms.ts` | `sendSms()` — `console`, generic `http` gateway, or `twilio`. |
| `src/lib/notify/templates.ts` | The actual message bodies for reset, verification and welcome. |
| `src/lib/csms/client.ts` | The only place that holds a CSMS credential: `csmsFetch()`, JWT caching and one silent re-login on 401, timeouts, `CsmsError` / `CsmsUnavailableError`. |
| `src/lib/csms/stations.ts` | Station queries and filtering, session history for a set of idTags, `remoteStart` / `remoteStop`, and the demo-data fallback. |
| `src/lib/csms/mapping.ts` | Translates raw CSMS charge points into `Station`, including the tag convention in section 7. |
| `src/lib/csms/demo-data.ts` | The sample network used when the CSMS is unreachable. |

---

## 4. Configuration

Copy `.env.example` to `.env.local`. Every variable has a working default except `SESSION_SECRET`,
which is mandatory in production.

### Core

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_URL` | `http://localhost:3100` | Public origin of this app. Used to build the links inside emails and SMS, so a wrong value produces reset links nobody can open. |

### Session

| Variable | Default | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | *(none)* | HMAC key for the session JWT. At least 32 characters. In development a fixed insecure fallback is used; in production a short or missing value throws at startup. Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `SESSION_COOKIE_NAME` | `evapp_session` | Cookie name. Change it if another app shares the domain. |
| `SESSION_MAX_AGE_DAYS` | `30` | Cookie and JWT lifetime. |

### Driver accounts

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | *(empty)* | Where driver accounts live. May be the same MongoDB as the CSMS: the app uses its own `driverusers` and `driververificationtokens` collections and never touches the operator `users` collection. Required in production. |
| `ALLOW_FILE_STORE` | `true` outside production | Permits the `.data/driver-accounts.json` fallback when Mongo is unreachable. Ignored when `NODE_ENV=production`. |

### CSMS

| Variable | Default | Purpose |
| --- | --- | --- |
| `CSMS_BASE_URL` | `http://127.0.0.1:3000/api` | Base URL of the CSMS REST API, including its `API_BASE_PATH`. |
| `CSMS_API_KEY` | *(empty)* | Static machine key sent as `x-api-key`. Must equal `API_KEY` in the CSMS `.env`. Takes precedence over the email/password pair. |
| `CSMS_EMAIL` | *(empty)* | Service account email, used when no API key is set. |
| `CSMS_PASSWORD` | *(empty)* | Service account password. The resulting JWT is cached in the server process for six hours. |
| `CSMS_TIMEOUT_MS` | `8000` | Per-request timeout. On timeout the request becomes a `CsmsUnavailableError`, which the demo fallback or a 503 handles. |
| `DEMO_DATA` | `true` outside production | Serve the built-in sample network when the CSMS cannot be reached, instead of failing. |

### Features

| Variable | Default | Purpose |
| --- | --- | --- |
| `ENABLE_REMOTE_START` | `false` | Lets a signed-in driver with a linked idTag start a session from the web app. Requires CSMS credentials with the `OPERATOR` role. |
| `DEV_EXPOSE_TOKENS` | `true` outside production | Returns reset tokens and OTP codes in the API response (`devToken`, `devCode`) so the flows can be clicked through before mail and SMS are wired up. Hard-disabled when `NODE_ENV=production`. |

### Email

| Variable | Default | Purpose |
| --- | --- | --- |
| `EMAIL_PROVIDER` | `console` | `console` writes to the log and `.data/outbox.log`; `smtp` sends through the server below. |
| `EMAIL_FROM` | `EV Charge <no-reply@example.com>` | From header on outgoing mail. |
| `SMTP_HOST` | *(empty)* | SMTP hostname. Required when `EMAIL_PROVIDER=smtp`. |
| `SMTP_PORT` | `587` | SMTP port. |
| `SMTP_SECURE` | `false` | `true` for implicit TLS (port 465); `false` uses STARTTLS. |
| `SMTP_USER` | *(empty)* | SMTP username. Leave blank for an unauthenticated relay. |
| `SMTP_PASS` | *(empty)* | SMTP password. |

### SMS

| Variable | Default | Purpose |
| --- | --- | --- |
| `SMS_PROVIDER` | `console` | `console`, `http` (generic gateway) or `twilio`. |
| `SMS_FROM` | `EVCHARGE` | Sender ID; also substituted for `{from}` in the HTTP gateway templates. |
| `SMS_HTTP_URL` | *(empty)* | Gateway URL. `{to}`, `{text}` and `{from}` are substituted and URL-encoded. |
| `SMS_HTTP_METHOD` | `GET` | HTTP method for the gateway. |
| `SMS_HTTP_BODY` | *(empty)* | Request body template, used for non-GET methods. Placeholders are substituted without URL-encoding. |
| `SMS_HTTP_HEADERS` | *(empty)* | Extra request headers as a JSON object, e.g. an API key. |
| `TWILIO_ACCOUNT_SID` | *(empty)* | Twilio account SID. |
| `TWILIO_AUTH_TOKEN` | *(empty)* | Twilio auth token. |
| `TWILIO_FROM` | *(empty)* | Twilio sending number in E.164. |
| `DEFAULT_COUNTRY_CODE` | `976` | Calling code applied to phone numbers typed without a `+`. |

### Branding and map (exposed to the browser)

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_BRAND_NAME` | `EV Charge` | Name in the header, page titles and message templates. |
| `NEXT_PUBLIC_MAP_TILE_URL` | OpenStreetMap tiles | Leaflet tile template. Point at your own tile server for production traffic. |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | `© OpenStreetMap contributors` | Attribution line required by the tile provider. |
| `NEXT_PUBLIC_MAP_CENTER_LAT` | `47.9184` | Initial map latitude. |
| `NEXT_PUBLIC_MAP_CENTER_LNG` | `106.9177` | Initial map longitude. |
| `NEXT_PUBLIC_MAP_ZOOM` | `12` | Initial map zoom. |

---

## 5. Connecting real email and SMS

Until this is done, every message is written to the terminal and to `.data/outbox.log`. That is
fine for development and useless in production — a driver who forgets their password has no way
back in.

### Email over SMTP

```env
EMAIL_PROVIDER=smtp
EMAIL_FROM="EV Charge <no-reply@yourdomain.mn>"
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey-or-username
SMTP_PASS=the-secret
```

- Port 587 with `SMTP_SECURE=false` means STARTTLS. Use port 465 with `SMTP_SECURE=true` for
  implicit TLS. Nothing else is a valid combination.
- Leave `SMTP_USER` empty for an unauthenticated internal relay; authentication is then skipped.
- `EMAIL_FROM` must be a domain the provider lets you send from, or your mail lands in spam.
- `nodemailer` is imported lazily, so the SMTP client is not bundled unless you actually select
  this provider. Restart the dev server after changing these values.

Verify: register an account, watch the server log for `[email] delivery failed` (there should be
none), then check the inbox.

### SMS option A — Twilio

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM=+15551234567
```

`TWILIO_FROM` must be E.164 and must be a number Twilio has issued to you. `SMS_FROM` is ignored
by this provider.

### SMS option B — generic HTTP gateway

Most local providers expose one URL. Three placeholders are substituted: `{to}` (E.164 recipient),
`{text}` (message body) and `{from}` (the value of `SMS_FROM`). In the URL they are
URL-encoded; in `SMS_HTTP_BODY` they are inserted verbatim, so keep them inside JSON string
quotes.

**Worked GET example**

```env
SMS_PROVIDER=http
SMS_FROM=EVCHARGE
SMS_HTTP_URL=https://api.provider.mn/send?apikey=SECRET&from={from}&to={to}&text={text}
SMS_HTTP_METHOD=GET
```

produces

```
GET https://api.provider.mn/send?apikey=SECRET&from=EVCHARGE&to=%2B97699112233&text=EV%20Charge%3A%20your%20password%20reset%20code%20is%20418205.%20It%20expires%20in%2010%20minutes.%20Do%20not%20share%20this%20code.
```

**Worked POST example**

```env
SMS_PROVIDER=http
SMS_FROM=EVCHARGE
SMS_HTTP_URL=https://api.provider.mn/v1/messages
SMS_HTTP_METHOD=POST
SMS_HTTP_BODY={"to":"{to}","message":"{text}","from":"{from}"}
SMS_HTTP_HEADERS={"Authorization":"Bearer SECRET"}
```

produces

```http
POST /v1/messages HTTP/1.1
Host: api.provider.mn
Authorization: Bearer SECRET
Content-Type: application/json

{"to":"+97699112233","message":"EV Charge: your password reset code is 418205. It expires in 10 minutes. Do not share this code.","from":"EVCHARGE"}
```

`SMS_HTTP_HEADERS` and `SMS_HTTP_BODY` are parsed as JSON, so they must be single-line and valid;
`Content-Type: application/json` is added automatically for non-GET requests unless you set it
yourself. Any non-2xx response is logged and reported as a delivery failure — the flow still
returns its neutral success response to the caller, by design (see section 9).

### Before going live

Turn `DEV_EXPOSE_TOKENS` off. It must not be `true` in production: leaving it on would return
password reset tokens to anyone who can call the API. It is ignored when `NODE_ENV=production`,
but remove it from the environment file anyway rather than relying on that.

---

## 6. Connecting the CSMS

Point the app at the CSMS REST API and give it one credential.

```env
CSMS_BASE_URL=http://127.0.0.1:3000/api
```

The URL must include the CSMS `API_BASE_PATH` (`/api` by default). No trailing slash is needed —
one is stripped if present.

**Option A — static machine key (simplest).** In the CSMS `.env` set `API_KEY` to a long random
string, then mirror it here:

```env
CSMS_API_KEY=the-same-long-random-string
```

The key is sent as an `x-api-key` header, and the CSMS treats it as an `ADMIN` caller, so remote
start works. Rotate it by changing both files and restarting both services.

**Option B — service account.** Create a CSMS user and put its credentials here:

```env
CSMS_EMAIL=webapp@yourdomain.mn
CSMS_PASSWORD=a-strong-password
```

The client logs in on first use, caches the JWT in the server process for six hours, and silently
re-logs in once if a request comes back 401. `CSMS_API_KEY` wins when both are configured.

**Roles.** Reading charge points and transactions needs any authenticated CSMS role (`VIEWER` is
enough). `POST /charge-points/:id/remote-start` and `POST /transactions/:id/stop` require
`OPERATOR` or higher, so give the service account `OPERATOR` if you intend to set
`ENABLE_REMOTE_START=true`. With a `VIEWER` account the CSMS returns 403 and the app surfaces it
as a failed start.

**CORS.** The CSMS `CORS_ORIGIN` does not need to include this app's origin. Every CSMS call is
made server-to-server from the Next.js process, where CORS does not apply. Only add this origin
to `CORS_ORIGIN` if you ever change that and call the CSMS from the browser — which would also
mean shipping a CSMS credential to the browser, so do not.

**Checking the link.** With the CSMS down you will see `[stations] serving demo data — …` in the
log and a "sample data" notice in the UI. When the connection is right, that notice disappears and
`demo` is `false` in the `/app-api/stations` response.

---

## 7. Station metadata convention

The CSMS has no fields for connector type or rated power — OCPP 1.6J does not report them, and the
`ChargePoint` model does not store them. The driver UI needs both, so `src/lib/csms/mapping.ts`
reads them from the charge point's free-form `tags` array.

**Plug aliases** (case-insensitive):

| Tag | Becomes |
| --- | --- |
| `type2`, `mennekes`, `iec62196` | Type2 |
| `ccs`, `ccs2`, `combo2` | CCS2 |
| `chademo` | CHAdeMO |
| `gbt`, `gb/t` | GBT |
| `type1`, `j1772` | Type1 |
| `schuko` | Schuko |

**Power tags** are a number followed by `kw`: `22kw`, `60kw`, `120kw`, `7.4kw`.

**Per-connector scope.** A bare tag applies to the whole charge point. Prefix it with `c<N>:` to
target connector *N* only:

```json
{
  "id": "UB-SQUARE-01",
  "tags": ["ccs2", "chademo", "120kw", "c3:type2", "c3:22kw", "24/7"]
}
```

That charge point offers CCS2 and CHAdeMO at up to 120 kW, except connector 3, which is a 22 kW
Type 2 socket. Connector 0 is ignored throughout: in OCPP it addresses the charge point as a
whole, not a physical socket. Unrecognised tags (`24/7`, `mall`, `airport`) are harmless — they
stay in `station.tags` and are searchable.

Derived values follow: `station.maxPowerKw` is the largest connector power, `station.connectorTypes`
is the de-duplicated set in a stable display order, and a connector with no tag of its own inherits
the charge point's first plug type and power.

**When the backend gains real fields**, `src/lib/csms/mapping.ts` is the only file to change:
`toStation()` is the single boundary between CSMS shapes and the `Station` type the whole UI
consumes. Delete the tag parsing there, read the new fields, and nothing else moves.

---

## 8. Routes

### Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page: what the network is, entry point to the map. |
| `/stations` | Station list and map, with search and filters. |
| `/stations/[id]` | One charge point: connectors, tariff, directions, start button. |
| `/login` | Sign in. Redirects to `/account` if already signed in. |
| `/register` | Create an account. |
| `/forgot-password` | Request a reset link or SMS code. |
| `/reset-password` | Set a new password from a link token or a phone number plus code. |
| `/verify-email` | Consume an email verification token. |
| `/account` | Profile: name, phone, language, charge tags, verification state. |
| `/account/wallet` | Prepaid balance, QPay top-up (presets + custom amount) and the wallet ledger. |
| `/account/security` | Change password, and the devices-signed-out consequence of doing so. |
| `/account/sessions` | Charging history for the linked charge tags. |
| `/pricing` | How tariffs work, plus a live table of current per-kWh prices. |
| `/help` | FAQ: finding a charger, plug types, charge tags, passwords, offline stations. |
| `/legal/terms` | Draft terms of service. |
| `/legal/privacy` | Draft privacy notice. |

Route-level UI files: `src/app/loading.tsx` (skeleton), `src/app/error.tsx` (client error boundary
with retry) and `src/app/not-found.tsx` (404, routes back to `/stations`).

`src/middleware.ts` redirects signed-out visitors from `/account/**` to `/login?next=…`, and
signed-in visitors away from `/login`, `/register` and `/forgot-password`.

### API

This app's own route handlers live under **`/app-api/`**, not `/api/`. In production the CSMS is
proxied at `https://eplug.mn/api/...` on the same origin, so anything this app served at `/api/`
would be shadowed by it — the same reason the admin console uses `/console-api/`.

Every endpoint answers errors as `{ error: string, fields?: Record<string,string> }` with a 4xx or
5xx status. "Session" means the cookie must be present and valid.

| Method | Endpoint | Auth | Success |
| --- | --- | --- | --- |
| POST | `/app-api/auth/register` | — | `{ user, verification: { sent, destination, devToken? } }`; 409 with `fields.email` / `fields.phone` |
| POST | `/app-api/auth/login` | — | `{ user }`; 401 on bad credentials |
| POST | `/app-api/auth/logout` | — | `{ ok: true }` |
| GET | `/app-api/auth/me` | session | `{ user }`; 401 when signed out |
| POST | `/app-api/auth/forgot-password` | — | Always 200 `{ ok, channel, destination?, message, devToken?, devCode? }` |
| POST | `/app-api/auth/reset-password` | — | `{ ok: true }`; body is `{ token, … }` or `{ phone, code, … }` |
| POST | `/app-api/auth/verify-email` | — | `{ ok: true, user }` |
| POST | `/app-api/auth/resend-verification` | session | `{ ok: true, destination, devToken? }` |
| POST | `/app-api/auth/phone/send-code` | session | `{ ok: true, destination, devCode? }` |
| POST | `/app-api/auth/phone/verify` | session | `{ ok: true, user }` |
| PATCH | `/app-api/account/profile` | session | `{ user }` |
| POST | `/app-api/account/password` | session | `{ ok: true }` — also bumps `tokenVersion` |
| POST | `/app-api/account/id-tags` | session | `{ user }` |
| DELETE | `/app-api/account/id-tags?idTag=XYZ` | session | `{ user }` |
| GET | `/app-api/sessions?limit=50` | session | `{ sessions: ChargingSession[] }` |
| POST | `/app-api/sessions/[id]/stop` | session | `{ status }` |
| GET | `/app-api/wallet?limit=10` | session | `{ wallet, config, entries, total }` |
| POST | `/app-api/wallet/topup` | session | `{ invoice }` with `qrImage`, `qrText` and bank deeplinks |
| GET | `/app-api/wallet/topup/[id]` | session | `{ invoice, paid, wallet }` — the polling endpoint |
| GET | `/app-api/stations` | — | `{ stations: Station[], demo: boolean, warning? }` |
| GET | `/app-api/stations/[id]` | — | `{ station, demo }`; 404 when unknown |
| POST | `/app-api/stations/[id]/start` | session | `{ status }` |

`/app-api/stations` accepts `search`, `status` (`all` \| `available` \| `busy` \| `offline`),
`connectorType`, `minPowerKw`, `lat`, `lng` and `limit`. Supplying `lat` and `lng` annotates each
station with `distanceKm` and sorts by it.

### The wallet

The balance lives in the CSMS, not here — this app only renders it. `src/lib/csms/wallet.ts` is
the server-side client; the browser never sees a CSMS credential.

Every wallet route derives the account id from the session cookie, never from the request, so a
driver can only read their own balance. `/app-api/wallet/topup/[id]` additionally re-reads the invoice
and refuses it unless `walletOwnerId` matches the signed-in account — without that check any
signed-in driver could force a QPay lookup on an invoice id they guessed.

Top-up flow:

1. The driver taps a preset (`WALLET_TOPUP_PRESETS` in the CSMS, default 1000 / 3000 / 5000 /
   10000 / 20000 / 50000 / 100000 ₮) or types an amount.
2. `POST /app-api/wallet/topup` creates a QPay invoice and returns the QR plus bank deeplinks.
3. The page polls `GET /app-api/wallet/topup/[id]` every 3 s (10 minutes, then manual "I have paid").
4. The CSMS credits the wallet when QPay confirms payment. The screen only ever reflects what the
   CSMS reports, so a driver cannot fake a paid balance by tampering with the client.

Linking a charge tag under `/account` also binds it to the account wallet in the CSMS, so charging
with that card draws on this balance. The bind is best-effort: a tag the operator has not created
in the CSMS yet still links to the account.

All wallet copy is in `src/lib/i18n/dictionaries.ts` under `wallet.*`, Mongolian first.

---

## 9. Auth model

**Cookie session.** Signing in sets one cookie (`SESSION_COOKIE_NAME`, default `evapp_session`)
holding an HS256 JWT signed with `SESSION_SECRET`. It is `HttpOnly` so no script can read it,
`SameSite=Lax` so it does not ride along on cross-site POSTs, `Secure` whenever
`NODE_ENV=production`, scoped to `/`, and it expires after `SESSION_MAX_AGE_DAYS`. The payload is
only `{ sub, email, v }` — no roles, no personal data. The one other cookie the app sets,
`evapp_locale`, holds a language code, is deliberately readable by scripts, and carries no
security meaning.

**Nothing is trusted from the cookie alone.** `getCurrentUser()` verifies the signature and then
re-reads the account on every request: an account that has been deactivated or deleted stops
working immediately. `middleware.ts` checks the signature only, because the Edge runtime cannot
reach Mongo; it decides redirects, never access to data.

**`tokenVersion` signs other devices out.** Each account carries an integer `tokenVersion`, copied
into the JWT as `v`. Changing the password — through `/app-api/account/password` or a reset —
increments it, so every previously issued cookie now mismatches and is rejected on its next
request. The device that performed the change is given a fresh cookie. That makes a password
change a working "sign out everywhere", which is the remedy a driver needs after losing a phone.

**Passwords** are bcrypt hashes at 12 rounds (`src/lib/auth/password.ts`). The plaintext is never
stored or logged. Minimum eight characters with at least one letter and one digit, enforced by the
zod schema; the sign-up form additionally shows a strength hint, which is advisory only.

**Tokens are hashed at rest.** A reset link carries `<tokenId>.<secret>`; only
`SHA-256(secret)` is stored, alongside the channel, the destination, an expiry and an attempt
counter. Comparison is constant-time. SMS codes are six random digits, hashed the same way. Time
to live: password reset 30 minutes, phone verification 10 minutes, email verification 24 hours.
Tokens are single-use, and issuing a new one of the same kind invalidates the outstanding ones.

**Rate limits.** `guard(req, scope, limit, windowMs)` in `src/lib/api.ts` applies a fixed-window
limit per client IP and scope to the sensitive endpoints — sign-in, registration, forgot-password,
code sending and verification — and throws 429 with a retry hint when exceeded. Token issuance is
additionally throttled per account through `countTokensSince()`, so rotating IPs does not help an
attacker. The limiter is in-memory: it is per Node process, and behind more than one instance you
need a shared store such as Redis.

**Forgot-password does not reveal whether an account exists.** `POST /app-api/auth/forgot-password`
answers 200 with the same envelope whether the identifier matched an account or not, whether
delivery succeeded or failed. This is deliberate: a differing response would turn the endpoint
into a membership oracle for any email address or phone number. The consequences to keep in mind:

- The UI must say "if that address is on file, a message is on its way" and never "no such user".
- `channel` is `email`, `sms` or `null`, describing the channel that *would* be used; `email`
  means a link was sent, `sms` means a six-digit code was sent.
- A real delivery failure is visible only in the server log, so monitor it.

---

## 10. Deployment notes

1. **Set the secrets and the database.**

   ```env
   SESSION_SECRET=<64 hex characters, unique to this deployment>
   MONGODB_URI=mongodb://user:pass@host:27017/csms?authSource=admin
   ```

   A `SESSION_SECRET` under 32 characters throws at startup in production rather than falling back.

2. **Turn off the development escape hatches.**

   ```env
   ALLOW_FILE_STORE=false
   DEMO_DATA=false
   # DEV_EXPOSE_TOKENS — remove the line entirely
   ```

   With `DEMO_DATA=false` an unreachable CSMS produces an honest 503 instead of quietly showing a
   fictional network to drivers.

3. **Set the public origin and the real providers.**

   ```env
   APP_URL=https://charge.yourdomain.mn
   NODE_ENV=production
   EMAIL_PROVIDER=smtp
   SMS_PROVIDER=twilio   # or http
   ```

   `APP_URL` must be the origin drivers actually reach, including scheme and any port, with no
   trailing slash — every reset and verification link is built from it.

4. **Point at the CSMS** as in section 6, with `OPERATOR` credentials if remote start is on.

5. **Build and run.**

   ```bash
   npm ci
   npm run build
   npm start          # listens on port 3100
   ```

   Put it behind a TLS-terminating reverse proxy and forward `X-Forwarded-For`, which is what the
   rate limiter uses to identify a client. Serve the app over HTTPS: the session cookie is marked
   `Secure` in production and a browser will simply drop it over plain HTTP.

6. **Scaling.** The rate limiter and the cached CSMS token live in process memory, so several
   instances will each keep their own. That is safe but weakens the limits; move the limiter to a
   shared store before running more than one instance.

---

## 11. Known gaps and next steps

- **Payments are wallet-only.** Prepaid top-ups work end to end (`/account/wallet`), and the CSMS
  debits a session against the balance when it ends. What is still missing is the *pay-per-session*
  path: an invoice raised for one session and shown as a QR right after unplugging, for a driver who
  would rather not hold a balance. The CSMS already supports it —
  `POST /api/payments/transactions/:id` — so this is a screen, not a backend change. Subscribing to
  `payment.paid` on the CSMS event stream would also let the wallet page stop polling.
- **Live status push.** Station status is fetched per request. The CSMS publishes a Server-Sent
  Events stream at `/api/events/stream` carrying live connector and transaction activity. Consuming
  it — server-side, then pushed to the browser, so no CSMS token reaches the client — would remove
  the need to reload a station page to see a plug free up.
- **Mongolian localisation is partial.** `src/lib/i18n` exists: the locale is read from the
  `evapp_locale` cookie, `mn` is the default with `en` as fallback, and both dictionaries are
  key-for-key complete. The dictionaries cover the shared chrome (`common`, `nav`, `footer`, the
  connector status labels), the account navigation and the whole wallet surface (`wallet.*`), which
  is Mongolian throughout. Everything else — the other page bodies, the forms, and the pricing, help
  and legal pages — is still hard-coded English, and the account `locale` field is not yet used to
  pick the language of an outgoing email or SMS. Extending `dictionaries.ts` surface by surface is
  the work; nothing structural is missing.
- **Driver-initiated reservations.** The CSMS supports OCPP reservations (`/api/reservations`) and
  the UI already renders the `Reserved` connector state, but a driver cannot make or cancel a
  reservation from this app.
- **Account deletion** is not self-service; there is no endpoint for it, and the privacy page says
  so honestly.
- **One process only.** See the scaling note in section 10.
