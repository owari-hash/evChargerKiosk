'use client';

import { useState } from 'react';
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
  /**
   * The gun whose QR sticker was scanned. It is pulled to the top and marked,
   * so a driver standing at it is not left comparing identical-looking rows.
   * The others stay visible on purpose: if this one is faulty, the next one
   * along is the answer.
   */
  scannedConnectorId?: number;
}

const LIVE_STATUSES = new Set(['Charging', 'SuspendedEV', 'SuspendedEVSE', 'Finishing']);

export function ConnectorList({
  connectors,
  className,
  locale,
  scannedConnectorId,
}: ConnectorListProps) {
  const d = getDictionary(locale ?? 'mn');

  if (connectors.length === 0) {
    return <p className={cn('text-sm text-muted', className)}>{d.stations.noConnectors}</p>;
  }

  return (
    <ScannedFirstList
      connectors={connectors}
      className={className}
      locale={locale}
      scannedConnectorId={scannedConnectorId}
    />
  );
}

/**
 * Arriving by QR, a driver is standing at one specific gun and does not want to
 * pick it out of a list of identical rows — so only that one is shown.
 *
 * The others are one tap away rather than gone: if the gun they scanned turns
 * out to be faulted or occupied, the next one along is the answer, and hiding
 * it entirely would strand them at the charger.
 */
function ScannedFirstList({
  connectors,
  className,
  locale,
  scannedConnectorId,
}: ConnectorListProps) {
  const d = getDictionary(locale ?? 'mn');
  const [showAll, setShowAll] = useState(false);

  const scanned =
    scannedConnectorId === undefined
      ? undefined
      : connectors.find((c) => c.connectorId === scannedConnectorId);

  // No scan, or a code pointing at a gun this station no longer reports: fall
  // back to the plain list rather than showing nothing.
  if (!scanned) {
    return (
      <ul className={cn('divide-y divide-border', className)}>
        {connectors.map((connector) => (
          <ConnectorRow key={connector.connectorId} connector={connector} locale={locale} />
        ))}
      </ul>
    );
  }

  const others = connectors.filter((c) => c.connectorId !== scanned.connectorId);
  const visible = showAll ? [scanned, ...others] : [scanned];

  return (
    <div className={className}>
      <ul className="divide-y divide-border">
        {visible.map((connector) => (
          <ConnectorRow
            key={connector.connectorId}
            connector={connector}
            locale={locale}
            scanned={connector.connectorId === scanned.connectorId}
          />
        ))}
      </ul>

      {others.length > 0 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-sm font-semibold text-brand transition hover:text-brand-strong"
        >
          {showAll
            ? d.stations.hideOtherConnectors
            : format(d.stations.showOtherConnectors, { count: others.length })}
        </button>
      ) : null}
    </div>
  );
}

function ConnectorRow({
  connector,
  locale,
  scanned = false,
}: {
  connector: StationConnector;
  locale?: Locale;
  scanned?: boolean;
}) {
  const d = getDictionary(locale ?? 'mn');
  const intl = intlLocale(locale);
  /**
   * `lastPowerW` and `lastSocPercent` are the last values the station ever
   * reported on this gun and they outlive the session that produced them — so
   * they were showing "0 кВт · 0%" before the first reading of a new session,
   * and the final reading long after one had ended. A live figure is only shown
   * while a transaction is actually running on the connector.
   */
  const live = LIVE_STATUSES.has(connector.status) && Boolean(connector.currentTransactionId);
  const soc = live ? connector.lastSocPercent : undefined;
  const power = live ? connector.lastPowerW : undefined;
  const faultCode =
    connector.status === 'Faulted' && connector.errorCode && connector.errorCode !== 'NoError'
      ? connector.errorCode
      : undefined;

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0',
        scanned && 'relative -mx-3 rounded-xl bg-brand-soft px-3 ring-1 ring-brand/30',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold',
          scanned
            ? 'bg-brand text-brand-contrast'
            : 'bg-surface-muted text-foreground',
        )}
      >
        {connector.connectorId}
      </span>

      <div className="min-w-0 flex-1">
        {scanned ? (
          <p className="mb-0.5 text-xs font-semibold text-brand-strong">
            {d.stations.scannedConnector}
          </p>
        ) : null}
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
