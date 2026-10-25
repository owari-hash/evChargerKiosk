'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Modal } from '@/components/ui';
import { format, useI18n } from '@/components/i18n-provider';
import type { ChargingSession, WalletEntry } from '@/lib/types';
import {
  cn,
  connectorLetter,
  connectorStatusTone,
  formatDateTime,
  formatDuration,
  formatKwh,
  formatMoney,
} from '@/lib/utils';

const STATUS_KEY = {
  Active: 'inProgress',
  Completed: 'completed',
  Rejected: 'rejected',
  Refunded: 'refunded',
} as const;

const STATUS_TONE: Record<ChargingSession['status'], string> = {
  Active: connectorStatusTone('Charging'),
  Completed: connectorStatusTone('Available'),
  Rejected: connectorStatusTone('Faulted'),
  Refunded: connectorStatusTone('Reserved'),
};

interface StationReportModalProps {
  /** This driver's sessions at one station, already narrowed to the date filter. */
  sessions: ChargingSession[];
  stationName: string;
  chargePointId: string;
  /** e.g. "2026.10.01 – 2026.10.25"; omitted when no date filter is set. */
  rangeLabel?: string;
  onClose: () => void;
}

/**
 * One driver's report for one station: how many times they charged there,
 * how much energy, what it cost them in total, and what is left in the wallet.
 */
export function StationReportModal({
  sessions,
  stationName,
  chargePointId,
  rangeLabel,
  onClose,
}: StationReportModalProps) {
  const { d } = useI18n();
  const t = d.account.sessions;
  const r = t.report;
  /** Wallet ledger lines per charging transaction: the debit and any refund. */
  const [ledger, setLedger] = useState<Map<number, LedgerLines> | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 100 is the most the API returns; older charges show without wallet lines.
    fetch('/app-api/wallet?limit=100', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { entries?: WalletEntry[] } | null) => {
        if (cancelled) return;
        const byTx = new Map<number, LedgerLines>();
        for (const e of data?.entries ?? []) {
          if (e.transactionId == null) continue;
          const lines = byTx.get(e.transactionId) ?? {};
          if (e.type === 'CHARGE') lines.charge = e;
          else if (e.type === 'REFUND') lines.refund = e;
          byTx.set(e.transactionId, lines);
        }
        setLedger(byTx);
      })
      .catch(() => {
        if (!cancelled) setLedger(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A refunded charge went back to the wallet and a rejected one never billed.
  const billed = sessions.filter((s) => s.status === 'Completed' || s.status === 'Active');
  const totalSpent = billed.reduce((sum, s) => sum + (s.cost ?? 0), 0);
  const totalKwh = billed.reduce((sum, s) => sum + (s.energyKwh ?? 0), 0);
  const average = billed.length ? Math.round(totalSpent / billed.length) : 0;
  const last = sessions[0];

  return (
    <Modal onClose={onClose} maxWidth="lg">
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">{r.title}</p>
          <h2 className="mt-0.5 truncate text-lg font-bold text-foreground">{stationName}</h2>
          <p className="mt-0.5 text-xs text-muted">{rangeLabel ?? r.allTime}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={r.close}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-muted hover:text-foreground"
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
            <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
        <dl className="grid grid-cols-2 gap-2.5">
          <Stat label={r.totalSpent} value={formatMoney(totalSpent)} highlight wide />
          <Stat label={r.sessions} value={String(billed.length)} />
          <Stat label={r.energy} value={formatKwh(totalKwh)} />
          <Stat label={r.average} value={formatMoney(average)} />
          <Stat
            label={r.lastCharge}
            value={last ? formatDateTime(last.startTimestamp) : '—'}
          />
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">{r.history}</h3>
          {sessions.length === 0 ? (
            <p className="rounded-xl bg-surface-muted/40 px-3 py-6 text-center text-sm text-muted">
              {t.filterEmpty}
            </p>
          ) : (
            <ul className="space-y-2.5">
              {sessions.map((s) => (
                <SessionDetail
                  key={s.transactionId}
                  session={s}
                  lines={ledger?.get(s.transactionId)}
                  ledgerLoading={ledger === null}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 sm:px-6">
        <Link
          href={`/stations/${encodeURIComponent(chargePointId)}`}
          className="inline-flex h-9 shrink-0 items-center rounded-lg bg-brand px-3.5 text-xs font-semibold text-white transition hover:bg-brand/90"
        >
          {r.openStation}
        </Link>
      </div>
    </Modal>
  );
}

interface LedgerLines {
  charge?: WalletEntry;
  refund?: WalletEntry;
}

/**
 * One charge in full: when and how long, energy, the price breakdown, and
 * the wallet before, the amount taken, and what was left after.
 */
function SessionDetail({
  session: s,
  lines,
  ledgerLoading,
}: {
  session: ChargingSession;
  lines?: LedgerLines;
  ledgerLoading: boolean;
}) {
  const { d } = useI18n();
  const t = d.account.sessions;
  const r = t.report;
  const charge = lines?.charge;
  const refund = lines?.refund;
  const hasFee = s.feeAmount != null && s.feeAmount > 0;

  return (
    <li className="overflow-hidden rounded-xl ring-1 ring-border">
      <div className="flex items-start justify-between gap-3 bg-surface-muted/40 px-3 py-2.5">
        <div className="min-w-0">
          <p suppressHydrationWarning className="text-sm font-semibold tabular-nums text-foreground">
            {formatDateTime(s.startTimestamp)}
          </p>
          <p suppressHydrationWarning className="mt-0.5 text-xs text-muted">
            {format(t.connector, { id: connectorLetter(s.connectorId) })} ·{' '}
            {formatDuration(s.startTimestamp, s.stopTimestamp)} · {formatKwh(s.energyKwh)}
          </p>
        </div>
        <Badge tone={STATUS_TONE[s.status]} className="shrink-0 text-[10px]">
          {t[STATUS_KEY[s.status]]}
        </Badge>
      </div>

      <div className="space-y-2.5 px-3 py-3">
        {/* Wallet: before → spent → left */}
        {charge ? (
          <div className="grid grid-cols-3 items-center gap-1 rounded-lg bg-surface-muted/30 p-2 text-center">
            <Flow label={r.before} value={formatMoney(charge.balanceAfter - charge.amount)} />
            <Flow label={r.spent} value={`−${formatMoney(Math.abs(charge.amount))}`} tone="spent" arrow />
            <Flow label={r.after} value={formatMoney(charge.balanceAfter)} tone="after" arrow />
          </div>
        ) : (
          <p className="rounded-lg bg-surface-muted/30 px-2.5 py-2 text-xs text-muted">
            {ledgerLoading ? '…' : r.noLedger}
          </p>
        )}

        {refund && (
          <div className="flex items-center justify-between rounded-lg bg-brand/10 px-2.5 py-2 text-xs ring-1 ring-brand/20">
            <span className="font-medium text-brand">{r.refunded}</span>
            <span className="font-bold tabular-nums text-brand">
              +{formatMoney(Math.abs(refund.amount))} → {formatMoney(refund.balanceAfter)}
            </span>
          </div>
        )}

        {/* Price breakdown */}
        <dl className="space-y-1 text-xs">
          {hasFee && (
            <>
              <Row label={t.energyCost} value={formatMoney(s.energyCost)} />
              <Row
                label={format(t.serviceFee, { percent: s.feePercent ?? '—' })}
                value={formatMoney(s.feeAmount)}
              />
            </>
          )}
          {s.energyKwh > 0 && s.cost != null && (
            <Row label={r.perKwh} value={formatMoney(Math.round(s.cost / s.energyKwh))} />
          )}
          <Row
            label={t.total}
            value={formatMoney(s.cost)}
            strong
            struck={s.status === 'Refunded' || s.status === 'Rejected'}
          />
        </dl>
      </div>
    </li>
  );
}

function Flow({
  label,
  value,
  tone,
  arrow = false,
}: {
  label: string;
  value: string;
  tone?: 'spent' | 'after';
  arrow?: boolean;
}) {
  return (
    <div className="relative min-w-0">
      {arrow && (
        <span aria-hidden className="absolute -left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted">
          →
        </span>
      )}
      <p className="truncate text-[10px] text-muted">{label}</p>
      <p
        suppressHydrationWarning
        className={cn(
          'mt-0.5 truncate text-[13px] font-bold tabular-nums',
          tone === 'spent' ? 'text-danger' : tone === 'after' ? 'text-brand' : 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
  struck = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
  struck?: boolean;
}) {
  return (
    <div className={cn('flex justify-between gap-3', strong && 'border-t border-border/50 pt-1')}>
      <dt className="text-muted">{label}</dt>
      <dd
        className={cn(
          'tabular-nums',
          strong ? 'font-bold text-foreground' : 'font-medium text-foreground',
          struck && 'text-muted line-through',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
  wide = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl p-3 ring-1',
        wide && 'col-span-2',
        highlight ? 'bg-brand/10 ring-brand/25' : 'bg-surface-muted/40 ring-border',
      )}
    >
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd
        suppressHydrationWarning
        className={cn('mt-0.5 truncate text-base font-bold tabular-nums', highlight ? 'text-brand' : 'text-foreground')}
      >
        {value}
      </dd>
    </div>
  );
}
