import { Badge } from '@/components/ui';
import type { StationConnector } from '@/lib/types';
import { cn, connectorStatusLabel, connectorStatusTone, formatPower } from '@/lib/utils';

interface ConnectorListProps {
  connectors: StationConnector[];
  className?: string;
}

const LIVE_STATUSES = new Set(['Charging', 'SuspendedEV', 'SuspendedEVSE', 'Finishing']);

export function ConnectorList({ connectors, className }: ConnectorListProps) {
  if (connectors.length === 0) {
    return (
      <p className={cn('text-sm text-muted', className)}>
        This charge point has not reported any connectors yet.
      </p>
    );
  }

  return (
    <ul className={cn('divide-y divide-border', className)}>
      {connectors.map((connector) => (
        <ConnectorRow key={connector.connectorId} connector={connector} />
      ))}
    </ul>
  );
}

function ConnectorRow({ connector }: { connector: StationConnector }) {
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
          <span className="sr-only">Connector {connector.connectorId}: </span>
          {connector.type ?? 'Plug type not published'}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {connector.powerKw ? `Up to ${connector.powerKw} kW` : 'Power rating not published'}
          {connector.availability === 'Inoperative' && ' · Taken out of service'}
          {faultCode && ` · ${faultCode}`}
        </p>
      </div>

      <Badge tone={connectorStatusTone(connector.status)}>
        {connectorStatusLabel(connector.status)}
      </Badge>

      {(power !== undefined || soc !== undefined) && (
        <div className="w-full sm:w-44">
          <p className="text-xs text-muted">
            {power !== undefined && <span>Now {formatPower(power)}</span>}
            {power !== undefined && soc !== undefined && ' · '}
            {soc !== undefined && <span>{Math.round(soc)}% charged</span>}
          </p>
          {soc !== undefined && (
            <div
              role="progressbar"
              aria-label={`Battery charge on connector ${connector.connectorId}`}
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
