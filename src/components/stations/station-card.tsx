import Link from 'next/link';
import { Badge } from '@/components/ui';
import type { Station } from '@/lib/types';
import { cn, formatDistance, formatMoney } from '@/lib/utils';
import { AvailabilityStatus } from './availability-dot';

interface StationCardProps {
  station: Station;
  /** Highlights the card that the map is currently centred on. */
  selected?: boolean;
  className?: string;
}

export function StationCard({ station, selected = false, className }: StationCardProps) {
  const distance = station.distanceKm === undefined ? '' : formatDistance(station.distanceKm);
  const plugs = `${station.availableConnectors}/${station.totalConnectors} free`;

  return (
    <Link
      href={`/stations/${encodeURIComponent(station.id)}`}
      className={cn(
        'flex h-full flex-col rounded-2xl bg-surface p-4 ring-1 shadow-[var(--shadow-card)] transition',
        'hover:ring-brand/50 focus-visible:ring-brand',
        selected ? 'ring-2 ring-brand' : 'ring-border',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{station.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">
            {station.address || 'Address not published'}
          </p>
        </div>
        {distance && (
          <span className="shrink-0 rounded-lg bg-surface-muted px-2 py-1 text-xs font-medium text-muted">
            {distance}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <AvailabilityStatus availability={station.availability} />
        <span className="text-sm text-muted">· {plugs}</span>
      </div>

      {station.connectorTypes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {station.connectorTypes.map((type) => (
            <Badge key={type}>{type}</Badge>
          ))}
        </div>
      )}

      <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-1 pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-2 border-t border-border pt-3">
          <dt className="text-muted">Max power</dt>
          <dd className="font-medium text-foreground">
            {station.maxPowerKw ? `${station.maxPowerKw} kW` : '—'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 border-t border-border pt-3">
          <dt className="text-muted">Price</dt>
          <dd className="font-medium text-foreground">
            {station.tariffPerKwh === undefined ? '—' : `${formatMoney(station.tariffPerKwh)}/kWh`}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
