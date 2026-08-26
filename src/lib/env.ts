/**
 * Server-side configuration. Everything is read lazily from `process.env` so the
 * module can also be imported from client bundles without leaking secrets — only
 * the `public` object is safe to reference in a client component.
 */

function str(key: string, fallback = ''): string {
  return (process.env[key] ?? '').trim() || fallback;
}

function bool(key: string, fallback: boolean): boolean {
  const raw = str(key);
  if (!raw) return fallback;
  return raw.toLowerCase() === 'true' || raw === '1';
}

function int(key: string, fallback: number): number {
  // An unset or blank variable must fall through to the default. Number('') is
  // 0 and Number.isFinite(0) is true, so testing the parsed value alone would
  // silently return 0 — which meant an unset CSMS_TIMEOUT_MS aborted every
  // request before it was sent, and an unset SESSION_MAX_AGE_DAYS expired the
  // session cookie immediately.
  const raw = str(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const isProduction = process.env.NODE_ENV === 'production';

export const serverEnv = {
  /** Origin this web app is served from — used to build links inside emails/SMS. */
  appUrl: () => str('APP_URL', 'http://localhost:3100').replace(/\/+$/, ''),

  // ---- session / crypto ----
  sessionSecret: () => str('SESSION_SECRET'),
  sessionCookieName: () => str('SESSION_COOKIE_NAME', 'evapp_session'),
  sessionMaxAgeDays: () => int('SESSION_MAX_AGE_DAYS', 30),

  // ---- driver account database ----
  mongoUri: () => str('MONGODB_URI'),
  /** Falls back to a JSON file under .data/ when Mongo is unreachable (dev only). */
  allowFileStore: () => bool('ALLOW_FILE_STORE', !isProduction),

  // ---- CSMS (the OCPP backend in ../evChargerBack) ----
  csmsBaseUrl: () => str('CSMS_BASE_URL', 'http://127.0.0.1:3000/api').replace(/\/+$/, ''),
  csmsApiKey: () => str('CSMS_API_KEY'),
  csmsEmail: () => str('CSMS_EMAIL'),
  csmsPassword: () => str('CSMS_PASSWORD'),
  csmsTimeoutMs: () => int('CSMS_TIMEOUT_MS', 8000),
  /** Serve a built-in sample network when the CSMS cannot be reached. */
  demoData: () => bool('DEMO_DATA', !isProduction),

  // ---- features ----
  enableRemoteStart: () => bool('ENABLE_REMOTE_START', false),
  /** Dev convenience: return reset tokens / OTP codes in the API response. */
  devExposeTokens: () => !isProduction && bool('DEV_EXPOSE_TOKENS', true),

  // ---- notifications ----
  emailProvider: () => str('EMAIL_PROVIDER', 'console').toLowerCase(),
  emailFrom: () => str('EMAIL_FROM', 'eplug <no-reply@example.com>'),
  smtp: () => ({
    host: str('SMTP_HOST'),
    port: int('SMTP_PORT', 587),
    secure: bool('SMTP_SECURE', false),
    user: str('SMTP_USER'),
    pass: str('SMTP_PASS'),
    rejectUnauthorized: bool('SMTP_REJECT_UNAUTHORIZED', true),
    pool: bool('SMTP_POOL', true),
  }),

  smsProvider: () => str('SMS_PROVIDER', 'console').toLowerCase(),
  smsFrom: () => str('SMS_FROM', 'Eplug'),
  smsHttp: () => ({
    url: str('SMS_HTTP_URL'),
    method: str('SMS_HTTP_METHOD', 'GET').toUpperCase(),
    /** JSON object template; `{to}` and `{text}` are substituted. */
    body: str('SMS_HTTP_BODY'),
    headers: str('SMS_HTTP_HEADERS'),
  }),
  twilio: () => ({
    accountSid: str('TWILIO_ACCOUNT_SID'),
    authToken: str('TWILIO_AUTH_TOKEN'),
    from: str('TWILIO_FROM'),
  }),
  messagePro: () => ({
    key: str('MESSAGEPRO_SMS_KEY'),
  }),
  callpro: () => ({
    key: str('CALLPRO_SMS_KEY'),
    url: str('CALLPRO_SMS_URL', 'https://api-text.callpro.mn/v1/sms/send'),
  }),

  /** Default country calling code used to normalise locally typed phone numbers. */
  defaultCountryCode: () => str('DEFAULT_COUNTRY_CODE', '976'),
} as const;

/** Values that are safe to expose to the browser (must be NEXT_PUBLIC_*). */
export const publicEnv = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'eplug',
  mapTileUrl:
    process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapAttribution:
    process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; OpenStreetMap contributors',
  defaultCenter: {
    lat: Number(process.env.NEXT_PUBLIC_MAP_CENTER_LAT ?? 47.9184),
    lng: Number(process.env.NEXT_PUBLIC_MAP_CENTER_LNG ?? 106.9177),
  },
  defaultZoom: Number(process.env.NEXT_PUBLIC_MAP_ZOOM ?? 12),
} as const;

/**
 * Fails fast on secrets that have no safe default. Called from the places that
 * actually need them so that browsing the site still works without a full setup.
 */
export function requireSessionSecret(): string {
  const secret = serverEnv.sessionSecret();
  if (secret.length >= 32) return secret; 
  if (isProduction) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters in production');
  }
  return 'dev-only-insecure-session-secret-change-me';
}
