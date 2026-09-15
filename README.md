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
| Backend | The driver API in `../evChargerBack` (`/app-api/*`), at `API_ORIGIN` — https://eplug.mn by default |
| Framework | Next.js 16.3 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 with CSS custom properties; light and dark themes |
| Accounts | Held by evChargerBack; this app has no database |
| Sessions | HttpOnly `evapp_session` cookie issued by evChargerBack; this app only forwards it |

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

**There is no local backend to run.** Server-rendered pages and the browser's `/app-api/*` calls
go to the driver API at `API_ORIGIN`, which defaults to **https://eplug.mn** — so a laptop shows
the live network and signs in with real accounts. To work against a local evChargerBack instead:

```bash
# in ../evChargerBack
HTTP_PORT=3010 NODE_ENV=development npx tsx src/index.ts
# here
API_ORIGIN=http://127.0.0.1:3010 npm run dev
```

A development evChargerBack returns SMS codes in its responses (`devCode`) and prints them to its
log, so sign-up and PIN reset are clickable without an SMS gateway.

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
                                  |  fetch('/app-api/...') on the page's own origin
                                  |  (cookie session)
                                  v
   +---------------------------------------------------------------+
   |  nginx, eplug.mn                                               |
   |    /app-api/*  /api/*  /ocpp/*   ->  evChargerBack :3000        |
   |    everything else               ->  this app :3100             |
   +----------+----------------------------------+-----------------+
              |                                  |
              v                                  v
   +-----------------------------+   +---------------------------+
   |  evChargerBack              |   |  Next.js 16 — this app    |
   |  /app-api  driver API       |<--|  pages read API_ORIGIN    |
   |  /api      operator API     |   |  with the visitor cookie  |
   |  MongoDB, wallets, QPay     |   |  (src/lib/driver-api.ts)  |
   +--------------+--------------+   +---------------------------+
                  |
                  |  OCPP 1.6J, JSON over WebSocket
                  v
        +-------------------------+
        |  Charge points          |
        +-------------------------+
```

### Security rule

**This app holds no secrets** — no database, no charging-network credential, no session-signing
key. Browser code calls `/app-api/*` on its own origin; server-rendered pages call
`${API_ORIGIN}/app-api/*` forwarding the visitor's own cookie; evChargerBack decides what that
driver may see. `src/app/app-api/[...path]/route.ts` forwards browser calls when nginx does not
route `/app-api` (for example under `next dev`), and `src/proxy.ts` only checks that a session
cookie is present before `/account/**` — the account pages still ask `auth/me`.

### Module map

| Module | Owns |
| --- | --- |
| `src/lib/types.ts` | Domain types shared by server and browser: `Station`, `StationConnector`, `ChargingSession`, `PublicUser`, `ConnectorStatus`, `ConnectorType`. |
| `src/lib/utils.ts` | Pure formatting and geo helpers — `formatKwh`, `formatPower`, `formatMoney`, `formatDateTime`, `formatDuration`, `haversineKm`, status labels and tones. Safe in client components. |
| `src/lib/env.ts` | Configuration: `serverEnv` (`API_ORIGIN`, timeout, cookie name) and `publicEnv` (`NEXT_PUBLIC_*` only). |
| `src/lib/driver-api.ts` | Server-side reads from the driver API with the visitor's cookie: `getCurrentUser()`, `listStations()`, `getStation()`, `getWallet()`, `listSessions()`. |
| `src/app/app-api/[...path]/route.ts` | Pass-through to `${API_ORIGIN}/app-api/*` for when nginx does not route it; relays `Set-Cookie`, refuses to loop back into itself. |
| `src/proxy.ts` | Redirects visitors without a session cookie away from `/account/**` (Next 16's renamed middleware). |
| `src/lib/validation.ts` | Client-side form schemas and `normalizePhone()`; the API validates again. |
| `src/lib/i18n/config.ts` | Supported locales (`mn` default, `en` fallback), the `evapp_locale` cookie name and label map. |
| `src/lib/i18n/dictionaries.ts` | All translated copy. `en` defines the shape; TypeScript makes `mn` provide every key. |
| `src/lib/i18n/index.ts` | Server side of the translation layer: `getLocale()`, `getDictionary()`, `getTranslations()` and `format()` for `{placeholder}` interpolation. |

---

## 4. Configuration

Copy `.env.example` to `.env.local`. Every variable has a working default.

### Driver API

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_ORIGIN` | `https://eplug.mn` | Origin of evChargerBack's driver API, without `/app-api` or a trailing slash. Server-rendered pages read from it, and `/app-api/*` is forwarded to it when nginx does not route that path. |
| `API_TIMEOUT_MS` | `10000` | Timeout for those requests. |
| `SESSION_COOKIE_NAME` | `evapp_session` | Must match `SESSION_COOKIE_NAME` in evChargerBack. |

Sessions, driver accounts, SMS, email, remote start and wallet settings are no longer configured
here. They live in **evChargerBack's `.env`** — see the "Driver API" section of its `.env.example`.

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

> **Moved to evChargerBack.** Email and SMS are sent by the driver API now, so the variables in
> this section go in `../evChargerBack/.env`, not in this app's `.env.local`.

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

## 6. Connecting the driver API

The driver API is part of evChargerBack (`src/driver`) and needs no credential from this app: it
authenticates drivers by their own `evapp_session` cookie.

```env
API_ORIGIN=https://eplug.mn
```

**In production** nginx routes `https://eplug.mn/app-api/` to evChargerBack
(`../evChargerBack/deploy/nginx-eplug.mn.conf`), so the browser's calls never reach this app and
the pass-through route is idle. Server-rendered pages still call `API_ORIGIN` themselves.

**CORS.** None is needed. The browser only ever calls its own origin, and server-rendered pages
call the API server-to-server.

**Checking the link.** `curl https://eplug.mn/app-api/stations` should answer JSON from
evChargerBack. If the pass-through answers `508`, `API_ORIGIN` leads back to this app — nginx is not
routing `/app-api/` to evChargerBack yet.

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

`src/proxy.ts` redirects visitors without a session cookie from `/account/**` to
`/login?next=…`; the auth pages redirect signed-in visitors to `/account`.

### API

The driver API lives under **`/app-api/`** and is served by **evChargerBack** (`src/driver`), not by
this app. It stays off `/api/`, which is the operator API on the same origin. The table below
predates PIN sign-in; `evChargerBack/src/driver/routes/` is the source of truth.

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

The balance lives in evChargerBack, not here — this app only renders what `/app-api/wallet`
returns.

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

> Implemented in evChargerBack (`src/driver/auth`) since the driver API moved there. Sign-in is
> phone + 4-digit PIN with SMS codes; the password wording below predates that.

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

1. **Deploy evChargerBack first**, with the driver-API keys in its `.env` — above all
   `SESSION_SECRET`, copied from this app's old production env so signed-in drivers stay signed in.

2. **Route `/app-api/` to evChargerBack in nginx** (the `location /app-api/` block in
   `../evChargerBack/deploy/nginx-eplug.mn.conf`), then `nginx -t && systemctl reload nginx`.

3. **Build and run this app.**

   ```bash
   npm ci
   npm run build
   npm start          # listens on port 3100
   ```

   `API_ORIGIN` defaults to `https://eplug.mn`; set it only to point at a different backend.
   Serve over HTTPS: the session cookie is `Secure` in production and a browser drops it over
   plain HTTP.

4. **Scaling.** This app keeps no state, so it can run as several instances. The driver API's
   rate limiter lives in evChargerBack's process memory.

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
