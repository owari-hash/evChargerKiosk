import type { ConnectorStatus, Station, StationAvailability } from './types';

/** Tiny classnames helper — no dependency needed for the handful of variants we use. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function formatKwh(kwh: number | undefined | null, digits = 2): string {
  if (kwh === undefined || kwh === null || Number.isNaN(kwh)) return '—';
  return `${kwh.toFixed(digits)} kWh`;
}

export function formatPower(watts: number | undefined | null): string {
  if (!watts) return '—';
  return watts >= 1000 ? `${(watts / 1000).toFixed(1)} kW` : `${Math.round(watts)} W`;
}

export function formatMoney(value: number | undefined | null, currency = '₮'): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${currency}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(from?: string | Date | null, to?: string | Date | null): string {
  if (!from) return '—';
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Great-circle distance in kilometres. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km?: number): string {
  if (km === undefined || Number.isNaN(km)) return '';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const STATUS_LABELS: Record<ConnectorStatus, string> = {
  Available: 'Available',
  Preparing: 'Preparing',
  Charging: 'Charging',
  SuspendedEV: 'Paused by car',
  SuspendedEVSE: 'Paused by station',
  Finishing: 'Finishing',
  Reserved: 'Reserved',
  Unavailable: 'Unavailable',
  Faulted: 'Out of order',
};

export function connectorStatusLabel(status: ConnectorStatus): string {
  return STATUS_LABELS[status] ?? status;
}

/** Tailwind classes per connector state, kept in one place so badges stay consistent. */
export function connectorStatusTone(status: ConnectorStatus): string {
  switch (status) {
    case 'Available':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30';
    case 'Charging':
    case 'Preparing':
    case 'Finishing':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-sky-500/30';
    case 'SuspendedEV':
    case 'SuspendedEVSE':
    case 'Reserved':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-amber-500/30';
    case 'Faulted':
      return 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/30';
    default:
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 ring-slate-500/30';
  }
}

export const AVAILABILITY_LABELS: Record<StationAvailability, string> = {
  available: 'Available now',
  busy: 'All plugs in use',
  offline: 'Offline',
  unknown: 'Status unknown',
};

export function availabilityTone(a: StationAvailability): string {
  switch (a) {
    case 'available':
      return 'bg-emerald-500';
    case 'busy':
      return 'bg-amber-500';
    case 'offline':
      return 'bg-slate-400';
    default:
      return 'bg-slate-300';
  }
}

export function stationSubtitle(station: Station): string {
  const bits: string[] = [];
  if (station.maxPowerKw) bits.push(`${station.maxPowerKw} kW`);
  if (station.connectorTypes.length) bits.push(station.connectorTypes.join(' · '));
  bits.push(`${station.availableConnectors}/${station.totalConnectors} free`);
  return bits.join(' • ');
}

/** Google Maps directions link — works on both desktop and mobile. */
export function directionsUrl(station: Station): string | undefined {
  if (station.latitude === undefined || station.longitude === undefined) return undefined;
  return `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
}
