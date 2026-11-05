/**
 * Driving routes for the map, shown on our own map instead of sending the
 * driver to Google Maps.
 *
 * Asks evChargerBack first (`/app-api/maps/route`), which routes with Google
 * and live traffic when it has a key, so slow and jammed stretches can be
 * painted orange and red. Without it (503, offline, quota), falls back to the
 * public OSRM server: same road geometry, no traffic.
 */

export type TrafficSpeed = 'NORMAL' | 'SLOW' | 'TRAFFIC_JAM';

export interface TrafficSpan {
  /** Index range into `points`, inclusive. */
  start: number;
  end: number;
  speed: TrafficSpeed;
}

export interface DrivingRoute {
  /** [lat, lng] pairs. */
  points: [number, number][];
  distanceMeters: number;
  /** With current traffic when the route came from Google. */
  durationSeconds: number;
  /** The same trip on empty roads; absent without traffic data. */
  staticDurationSeconds?: number;
  traffic: TrafficSpan[];
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Minutes the traffic adds, or 0 when unknown. */
export function trafficDelayMinutes(route: DrivingRoute): number {
  if (!route.staticDurationSeconds) return 0;
  return Math.max(0, Math.round((route.durationSeconds - route.staticDurationSeconds) / 60));
}

async function fromBackend(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<DrivingRoute | null> {
  const qs = new URLSearchParams({ from: `${from.lat},${from.lng}`, to: `${to.lat},${to.lng}` });
  const res = await fetch(`/app-api/maps/route?${qs}`, { signal, credentials: 'same-origin' });
  if (!res.ok) return null;
  const body = (await res.json()) as Partial<DrivingRoute>;
  if (!Array.isArray(body.points) || body.points.length < 2) return null;
  const last = body.points.length - 1;
  return {
    points: body.points,
    distanceMeters: body.distanceMeters ?? 0,
    durationSeconds: body.durationSeconds ?? 0,
    staticDurationSeconds: body.staticDurationSeconds,
    traffic: (body.traffic ?? [])
      .map((t) => ({ ...t, start: Math.max(0, Math.min(last, t.start)), end: Math.max(0, Math.min(last, t.end)) }))
      .filter((t) => t.end > t.start),
  };
}

async function fromOsrm(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<DrivingRoute | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}` +
    '?overview=full&geometries=geojson';
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const body = (await res.json()) as {
    code?: string;
    routes?: { distance?: number; duration?: number; geometry?: { coordinates?: [number, number][] } }[];
  };
  const first = body.code === 'Ok' ? body.routes?.[0] : undefined;
  const coords = first?.geometry?.coordinates;
  if (!first || !coords || coords.length < 2) return null;
  return {
    // GeoJSON is [lng, lat].
    points: coords.map(([lng, lat]) => [lat, lng]),
    distanceMeters: first.distance ?? 0,
    durationSeconds: Math.round(first.duration ?? 0),
    traffic: [],
  };
}

export async function fetchDrivingRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<DrivingRoute> {
  try {
    const route = await fromBackend(from, to, signal);
    if (route) return route;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
  }
  const fallback = await fromOsrm(from, to, signal);
  if (!fallback) throw new Error('route unavailable');
  return fallback;
}

/** Google tiles with the live traffic layer for the theme, or null to keep the default tiles. */
export async function fetchTrafficTiles(theme: 'light' | 'dark'): Promise<string | null> {
  try {
    const res = await fetch(`/app-api/maps/tiles?theme=${theme}`, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const body = (await res.json()) as { urlTemplate?: string };
    return body.urlTemplate ?? null;
  } catch {
    return null;
  }
}
