import Link from 'next/link';
import { Badge } from '@/components/ui';
import type { Station } from '@/lib/types';
import type { Locale } from '@/lib/i18n/config';
import { format, getDictionary } from '@/lib/i18n/dictionaries';
import { cn, formatDistance, formatPowerKw, formatTariff, intlLocale } from '@/lib/utils';
import { AvailabilityStatus } from './availability-dot';

interface StationCardProps {
  station: Station;
  /** Highlights the card that the map is currently centred on. */
  selected?: boolean;
  className?: string;
  /** Defaults to the product locale; pass `useI18n().locale` from a client tree. */
  locale?: Locale;
}

export function StationCard({ station, selected = false, className, locale }: StationCardProps) {
  const d = getDictionary(locale ?? 'mn');
  const intl = intlLocale(locale);
  const distance = station.distanceKm === undefined ? '' : formatDistance(station.distanceKm, intl);
  const plugs = format(d.stations.free, {
    available: station.availableConnectors,
    total: station.totalConnectors,
  });

  return (
    <Link
      href={`/stations/${encodeURIComponent(station.id)}`}
      className={cn(
        'flex h-full w-full min-w-0 max-w-full flex-col overflow-hidden rounded-2xl bg-surface p-3.5 sm:p-4 ring-1 shadow-[var(--shadow-card)] transition',
        'hover:ring-brand/50 focus-visible:ring-brand',
        selected ? 'ring-2 ring-brand' : 'ring-border',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2.5 sm:gap-3 min-w-0 max-w-full">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm sm:text-base font-semibold text-foreground">{station.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-xs sm:text-sm text-muted break-words">
            {station.address || d.stations.addressMissing}
          </p>
        </div>
        {distance && (
          <span className="shrink-0 rounded-lg bg-surface-muted px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-medium text-muted whitespace-nowrap">
            {distance}
          </span>
        )}
      </div>

      <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 max-w-full">
        <AvailabilityStatus availability={station.availability} locale={locale} className="text-xs sm:text-sm shrink-0" />
        <span className="truncate min-w-0 text-xs sm:text-sm text-muted">· {plugs}</span>
      </div>

      {station.connectorTypes.length > 0 && (
        <div className="mt-2.5 sm:mt-3 flex flex-wrap gap-1 sm:gap-1.5 min-w-0 max-w-full">
          {station.connectorTypes.map((type) => (
            <Badge key={type} className="max-w-full truncate px-2 py-0.5 text-[11px] sm:text-xs">
              {type}
            </Badge>
          ))}
        </div>
      )}

      <dl className="mt-auto grid grid-cols-2 gap-x-2 sm:gap-x-4 gap-y-1 pt-3 sm:pt-4 text-xs sm:text-sm min-w-0 max-w-full">
        <div className="min-w-0 overflow-hidden border-t border-border pt-2 sm:pt-2.5">
          <dt className="truncate text-[11px] sm:text-xs text-muted">{d.stations.maxPower}</dt>
          <dd className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-foreground">
            {station.maxPowerKw ? formatPowerKw(station.maxPowerKw, intl) : '—'}
          </dd>
        </div>
        <div className="min-w-0 overflow-hidden border-t border-border pt-2 sm:pt-2.5">
          <dt className="truncate text-[11px] sm:text-xs text-muted">{d.stations.price}</dt>
          <dd className="mt-0.5 truncate text-xs sm:text-sm font-semibold text-foreground">
            {formatTariff(station.tariffPerKwh, intl)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
