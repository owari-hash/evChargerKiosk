import { DEFAULT_LOCALE, isLocale, type Locale } from './i18n/config';
import { getDictionary } from './i18n/dictionaries';
import type { ConnectorStatus, Station, StationAvailability } from './types';

/** Narrows an arbitrary locale string ('mn', 'en-GB', undefined) to a supported one. */
function toAppLocale(locale?: string): Locale {
  if (isLocale(locale)) return locale;
  if (locale?.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

/** Tiny classnames helper — no dependency needed for the handful of variants we use. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/**
 * Formatting locale. Mongolian is the product default; pass 'en-GB' (or the value
 * from useI18n().locale) to render a screen in English.
 */
export type FormatLocale = 'mn-MN' | 'en-GB' | string;

export const DEFAULT_FORMAT_LOCALE: FormatLocale = 'mn-MN';

/** Maps the app's locale code onto the matching Intl locale. */
export function intlLocale(locale?: string): FormatLocale {
  if (!locale) return DEFAULT_FORMAT_LOCALE;
  if (locale.startsWith('en')) return 'en-GB';
  return 'mn-MN';
}

/**
 * Intl throws on a malformed tag, which would take a whole page down over a
 * formatting detail. Anything unrecognised falls back to the default locale.
 */
function safeLocale(locale: FormatLocale): FormatLocale {
  try {
    return Intl.NumberFormat.supportedLocalesOf(locale).length > 0 ? locale : DEFAULT_FORMAT_LOCALE;
  } catch {
    return DEFAULT_FORMAT_LOCALE;
  }
}

const UNITS = {
  'mn-MN': { kwh: 'кВт·ц', kw: 'кВт', w: 'Вт', hour: 'ц', minute: 'м', km: 'км', m: 'м' },
  'en-GB': { kwh: 'kWh', kw: 'kW', w: 'W', hour: 'h', minute: 'm', km: 'km', m: 'm' },
} as const;

function units(locale: FormatLocale) {
  return locale.startsWith('en') ? UNITS['en-GB'] : UNITS['mn-MN'];
}

export function formatNumber(
  value: number,
  locale: FormatLocale = DEFAULT_FORMAT_LOCALE,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(safeLocale(locale), options).format(value);
}

export function formatKwh(
  kwh: number | undefined | null,
  locale: FormatLocale = DEFAULT_FORMAT_LOCALE,
  digits = 2,
): string {
  if (kwh === undefined || kwh === null || Number.isNaN(kwh)) return '—';
  const value = formatNumber(kwh, locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${value} ${units(locale).kwh}`;
}

export function formatPower(
  watts: number | undefined | null,
  locale: FormatLocale = DEFAULT_FORMAT_LOCALE,
): string {
  if (!watts) return '—';
  const u = units(locale);
  return watts >= 1000
    ? `${formatNumber(watts / 1000, locale, { maximumFractionDigits: 1 })} ${u.kw}`
    : `${formatNumber(Math.round(watts), locale)} ${u.w}`;
}

/** Power ratings are advertised as whole numbers: "120 кВт", not "120.0 кВт". */
export function formatPowerKw(
  kw: number | undefined | null,
  locale: FormatLocale = DEFAULT_FORMAT_LOCALE,
): string {
  if (kw === undefined || kw === null || Number.isNaN(kw)) return '—';
  return `${formatNumber(kw, locale, { maximumFractionDigits: 0 })} ${units(locale).kw}`;
}

export function formatMoney(
  value: number | undefined | null,
  locale: FormatLocale = DEFAULT_FORMAT_LOCALE,
): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(safeLocale(locale), {
    style: 'currency',
    currency: 'MNT',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Tariffs read as a rate: "₮ 550/кВт·ц". */
export function formatTariff(
  perKwh: number | undefined | null,
  locale: FormatLocale = DEFAULT_FORMAT_LOCALE,
): string {
  if (perKwh === undefined || perKwh === null || Number.isNaN(perKwh)) return '—';
  return `${formatMoney(perKwh, locale)}/${units(locale).kwh}`;
}

export function formatDateTime(
  value?: string | Date | null,
  locale: FormatLocale = DEFAULT_FORMAT_LOCALE,
): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(safeLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(
  value?: string | Date | null,
  locale: FormatLocale = DEFAULT_FORMAT_LOCALE,
): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(safeLocale(locale), { year: 'numeric', month: 'short', day: '2-digit' });
}

export function formatDuration(
  from?: string | Date | null,
  to?: string | Date | null,
  locale: FormatLocale = DEFAULT_FORMAT_LOCALE,
): string {
  if (!from) return '—';
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  const minutes = Math.max(0, Math.round((end - start) / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const u = units(locale);
  return h > 0 ? `${h}${u.hour} ${m}${u.minute}` : `${m}${u.minute}`;
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

export function formatDistance(
  km?: number,
  locale: FormatLocale = DEFAULT_FORMAT_LOCALE,
): string {
  if (km === undefined || Number.isNaN(km)) return '';
  const u = units(locale);
  return km < 1
    ? `${formatNumber(Math.round(km * 1000), locale)} ${u.m}`
    : `${formatNumber(km, locale, { maximumFractionDigits: 1 })} ${u.km}`;
}

/**
 * Status wording is translated, so it comes from the dictionary rather than a
 * table here. Pass the locale from `useI18n()` or `getLocale()`.
 */
export function connectorStatusLabel(status: ConnectorStatus, locale?: string): string {
  return getDictionary(toAppLocale(locale)).status.connector[status] ?? status;
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

export function availabilityLabel(a: StationAvailability, locale?: string): string {
  return getDictionary(toAppLocale(locale)).status.availability[a] ?? a;
}

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

export function stationSubtitle(station: Station, locale?: string): string {
  const intl = intlLocale(locale);
  const bits: string[] = [];
  if (station.maxPowerKw) bits.push(formatPowerKw(station.maxPowerKw, intl));
  if (station.connectorTypes.length) bits.push(station.connectorTypes.join(' · '));
  bits.push(`${station.availableConnectors}/${station.totalConnectors}`);
  return bits.join(' • ');
}

/** Google Maps directions link — works on both desktop and mobile. */
export function directionsUrl(station: Station): string | undefined {
  if (station.latitude === undefined || station.longitude === undefined) return undefined;
  return `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
}
