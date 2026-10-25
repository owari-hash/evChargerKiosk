'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Station } from '@/lib/types';
import type { Locale } from '@/lib/i18n/config';
import { format, getDictionary } from '@/lib/i18n/dictionaries';
import { cn, directionsUrl, formatPowerKw, formatTariff, intlLocale } from '@/lib/utils';

interface StationCardProps {
  station: Station;
  /** Highlights the card that the map is currently centred on. */
  selected?: boolean;
  className?: string;
  /** Defaults to the product locale; pass `useI18n().locale` from a client tree. */
  locale?: Locale;
}

/**
 * One station in the finder: name with a directions arrow, live state and
 * plug types on one line, then power and price as two small stats.
 */
export function StationCard({ station, selected = false, className, locale }: StationCardProps) {
  const router = useRouter();
  const d = getDictionary(locale ?? 'mn');
  const intl = intlLocale(locale);
  const online = station.availability !== 'offline';
  const directions = directionsUrl(station);
  const plugs = format(d.stations.free, {
    available: station.availableConnectors,
    total: station.totalConnectors,
  });

  return (
    <Link
      href={`/stations/${encodeURIComponent(station.id)}`}
      className={cn(
        'group flex h-full w-full min-w-0 flex-col rounded-2xl bg-surface p-4 ring-1 shadow-[var(--shadow-card)] transition duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand/40 focus-visible:ring-brand',
        selected ? 'ring-2 ring-brand' : 'ring-border',
        className,
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h3 className="truncate text-[15px] font-semibold leading-snug text-foreground">{station.name}</h3>
        {directions && (
          // A button, not a link: the whole card is already a link.
          <button
            type="button"
            aria-label={d.stations.directions}
            title={d.stations.directions}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              router.push(directions);
            }}
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/25 transition hover:bg-brand/20"
          >
            {/* Map pin: tapping shows the station on the map. */}
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
              <path strokeLinejoin="round" d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11Z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </button>
        )}
      </div>

      <div className="mt-3 flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              online
                ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/10 text-red-600 dark:text-red-400',
            )}
          >
            <span aria-hidden className={cn('size-1.5 rounded-full', online ? 'bg-emerald-500' : 'bg-red-500')} />
            {online ? d.headerStatus.online : d.headerStatus.offline}
          </span>
          {online && <span className="truncate text-xs font-medium text-muted">{plugs}</span>}
        </div>
        {station.connectorTypes.length > 0 && (
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {station.connectorTypes.map((type) => (
              <span
                key={type}
                className="rounded-md bg-surface-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground/80 ring-1 ring-border"
              >
                {type}
              </span>
            ))}
          </div>
        )}
      </div>

      <dl className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <div className="min-w-0 rounded-xl bg-surface-muted/60 px-3 py-2">
          <dt className="truncate text-[11px] text-muted">{d.stations.maxPower}</dt>
          <dd className="mt-0.5 truncate text-sm font-bold text-foreground">
            {station.maxPowerKw ? formatPowerKw(station.maxPowerKw, intl) : '—'}
          </dd>
        </div>
        <div className="min-w-0 rounded-xl bg-surface-muted/60 px-3 py-2">
          <dt className="truncate text-[11px] text-muted">{d.stations.price}</dt>
          <dd className="mt-0.5 truncate text-sm font-bold text-brand">
            {formatTariff(station.tariffPerKwh, intl)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
