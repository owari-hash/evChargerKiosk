import { Badge } from '@/components/ui';
import type { StationConnector } from '@/lib/types';
import type { Locale } from '@/lib/i18n/config';
import { format, getDictionary } from '@/lib/i18n/dictionaries';
import {
  cn,
  connectorStatusLabel,
  connectorStatusTone,
  formatPower,
  formatPowerKw,
  intlLocale,
} from '@/lib/utils';

interface ConnectorListProps {
  connectors: StationConnector[];
  className?: string;
  locale?: Locale;
}

const LIVE_STATUSES = new Set(['Charging', 'SuspendedEV', 'SuspendedEVSE', 'Finishing']);

export function ConnectorList({ connectors, className, locale }: ConnectorListProps) {
  const d = getDictionary(locale ?? 'mn');

  if (connectors.length === 0) {
    return <p className={cn('text-sm text-muted', className)}>{d.stations.noConnectors}</p>;
  }

  return (
    <ul className={cn('divide-y divide-border', className)}>
      {connectors.map((connector) => (
        <ConnectorRow key={connector.connectorId} connector={connector} locale={locale} />
      ))}
    </ul>
  );
}

function ConnectorRow({ connector, locale }: { connector: StationConnector; locale?: Locale }) {
  const d = getDictionary(locale ?? 'mn');
  const intl = intlLocale(locale);
  const live = LIVE_STATUSES.has(connector.status);
  const soc = live ? connector.lastSocPercent : undefined;
  const power = live ? connector.lastPowerW : undefined;
  const faultCode =
    connector.status === 'Faulted' && connector.errorCode && connector.errorCode !== 'NoError'
      ? connector.errorCode
      : undefined;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0">
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-muted text-sm font-semibold text-foreground"
      >
        {connector.connectorId}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          <span className="sr-only">
            {format(d.stations.connectorN, { id: connector.connectorId })}
          </span>
          {connector.type ?? d.stations.plugTypeMissing}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {connector.powerKw
            ? format(d.stations.upToPower, { power: formatPowerKw(connector.powerKw, intl) })
            : d.stations.powerMissing}
          {connector.availability === 'Inoperative' && ` · ${d.stations.outOfService}`}
          {faultCode && ` · ${faultCode}`}
        </p>
      </div>

      <Badge tone={connectorStatusTone(connector.status)}>
        {connectorStatusLabel(connector.status, locale)}
      </Badge>

      {(power !== undefined || soc !== undefined) && (
        <div className="w-full sm:w-44">
          <p className="text-xs text-muted">
            {power !== undefined && (
              <span>{format(d.stations.nowPower, { power: formatPower(power, intl) })}</span>
            )}
            {power !== undefined && soc !== undefined && ' · '}
            {soc !== undefined && (
              <span>{format(d.stations.battery, { percent: Math.round(soc) })}</span>
            )}
          </p>
          {soc !== undefined && (
            <div
              role="progressbar"
              aria-label={
                format(d.stations.connectorN, { id: connector.connectorId }) +
                format(d.stations.battery, { percent: Math.round(soc) })
              }
              aria-valuenow={Math.round(soc)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
            >
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.min(100, Math.max(0, soc))}%` }}
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
}
