/**
 * Configuration. Everything server-side is read lazily from `process.env`, so the
 * module can also be imported from client bundles — only `publicEnv` is safe to
 * reference in a client component.
 */

function str(key: string, fallback = ''): string {
  return (process.env[key] ?? '').trim() || fallback;
}

function int(key: string, fallback: number): number {
  // An unset or blank variable must fall through to the default: Number('') is 0.
  const raw = str(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const serverEnv = {
  /**
   * Origin of the driver API (evChargerBack), without `/app-api`. Server-rendered
   * pages read from it, and `app/app-api/[...path]` forwards browser calls to it.
   */
  apiOrigin: () => str('API_ORIGIN', 'https://eplug.mn').replace(/\/+$/, ''),
  apiTimeoutMs: () => int('API_TIMEOUT_MS', 10_000),
  /** Must match SESSION_COOKIE_NAME in evChargerBack. */
  sessionCookieName: () => str('SESSION_COOKIE_NAME', 'evapp_session'),
} as const;

/** Values that are safe to expose to the browser (must be NEXT_PUBLIC_*). */
export const publicEnv = {
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Жиркто ххк',
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
