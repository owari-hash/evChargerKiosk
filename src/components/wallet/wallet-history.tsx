'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui';
import { EbarimtModal } from '@/components/account/ebarimt-modal';
import type { ChargingSession, WalletEntry } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { format } from '@/components/i18n-provider';
import { formatDateTime, formatMoney, intlLocale } from '@/lib/utils';

/** Entries shown before "show all". */
const COLLAPSED = 6;

interface WalletHistoryProps {
  entries: WalletEntry[];
  d: Dictionary;
  locale: string;
}

export function WalletHistory({ entries, d, locale }: WalletHistoryProps) {
  const intl = intlLocale(locale);
  const money = (value: number) => formatMoney(value, intl);
  const [selectedSession, setSelectedSession] = useState<ChargingSession | null>(null);
  const [expanded, setExpanded] = useState(false);
  // The latest few answer "did my top-up land?"; the rest is one tap away.
  const visible = expanded ? entries : entries.slice(0, COLLAPSED);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{d.wallet.history.title}</CardTitle>
        </CardHeader>
        <div>
          {entries.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">{d.wallet.history.empty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((entry) => {
                const credit = entry.amount > 0;
                const eb = entry.ebarimt;

                // Only a receipt the PosAPI actually issued gets a button — a
                // made-up lottery number or receipt id would pass as a real one.
                const issued = !!(eb?.receiptId || eb?.lottery) && (eb.status === 'SUCCESS' || eb.status === 'REFUNDED');
                const receiptSession: ChargingSession | null = issued
                  ? {
                      transactionId: entry.transactionId ?? 0,
                      status: 'Completed',
                      chargePointId: entry.chargePointId ?? '',
                      connectorId: entry.connectorId ?? 0,
                      idTag: entry.idTag ?? '',
                      startTimestamp: entry.createdAt,
                      stopTimestamp: entry.createdAt,
                      energyKwh: 0,
                      cost: Math.abs(entry.amount),
                      ebarimt: eb,
                    }
                  : null;

                // The description repeats the amount for top-ups ("Хэтэвч
                // цэнэглэлт — 1,000₮") and was cut off as a title; the type
                // reads cleaner, with a charge's kWh as a small detail.
                const kwh = entry.description?.match(/([\d.,]+)\s*кВт·ц/)?.[1];

                return (
                  <li key={entry.id} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-surface-muted/30">
                    <span
                      aria-hidden
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                        credit ? 'bg-brand-soft text-brand-strong' : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {credit ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4">
                          <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
                        </svg>
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {d.wallet.history.type[entry.type]}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span suppressHydrationWarning className="tabular-nums">
                          {formatDateTime(entry.createdAt, intl)}
                        </span>
                        {kwh && (
                          <span className="rounded-md bg-surface-muted px-1.5 py-0.5 font-medium tabular-nums text-foreground/80">
                            ⚡ {kwh} кВт·ц
                          </span>
                        )}
                        {receiptSession && (
                          <button
                            type="button"
                            onClick={() => setSelectedSession(receiptSession)}
                            className="font-semibold text-brand hover:underline"
                          >
                            {d.account.ebarimt.viewButton}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p
                        className={`text-[15px] font-bold tabular-nums ${
                          credit ? 'text-brand-strong' : 'text-danger'
                        }`}
                      >
                        {credit ? '+' : '−'}
                        {money(Math.abs(entry.amount))}
                      </p>
                      {/* Plain colour but bold: the green/red amount says which way
                          money moved, this says where the wallet ended up. */}
                      <p className="mt-0.5 text-xs font-bold text-foreground tabular-nums">
                        {format(d.wallet.history.balanceAfter, {
                          balance: money(entry.balanceAfter),
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {entries.length > COLLAPSED && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full border-t border-border px-5 py-3 text-sm font-semibold text-brand transition hover:bg-surface-muted/40"
            >
              {expanded
                ? d.wallet.history.showLess
                : format(d.wallet.history.showAll, { count: entries.length })}
            </button>
          )}
        </div>
      </Card>

      {selectedSession && (
        <EbarimtModal
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </>
  );
}
