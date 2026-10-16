'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Button } from '@/components/ui';
import { EbarimtModal } from '@/components/account/ebarimt-modal';
import type { ChargingSession, WalletEntry } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import { format } from '@/components/i18n-provider';
import { formatDateTime, formatMoney, intlLocale } from '@/lib/utils';

interface WalletHistoryProps {
  entries: WalletEntry[];
  d: Dictionary;
  locale: string;
}

export function WalletHistory({ entries, d, locale }: WalletHistoryProps) {
  const intl = intlLocale(locale);
  const money = (value: number) => formatMoney(value, intl);
  const [selectedSession, setSelectedSession] = useState<ChargingSession | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{d.wallet.history.title}</CardTitle>
        </CardHeader>
        <CardBody className="px-0 py-0">
          {entries.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">{d.wallet.history.empty}</p>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry) => {
                const credit = entry.amount > 0;
                const eb = entry.ebarimt;

                // Only a receipt the PosAPI actually issued gets a button — a
                // made-up lottery number or receipt id would pass as a real one.
                const issued = !!eb?.receiptId && (eb.status === 'SUCCESS' || eb.status === 'REFUNDED');
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

                return (
                  <li key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-surface-muted/30 transition">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {entry.description || d.wallet.history.type[entry.type]}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {entry.description && `${d.wallet.history.type[entry.type]} · `}
                        {formatDateTime(entry.createdAt, intl)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      {receiptSession && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="text-xs font-medium"
                          onClick={() => setSelectedSession(receiptSession)}
                        >
                          {d.account.ebarimt.viewButton}
                        </Button>
                      )}

                      <div className="text-right">
                        <p
                          className={`text-sm font-bold tabular-nums ${
                            credit ? 'text-brand-strong' : 'text-foreground'
                          }`}
                        >
                          {credit ? '+' : '−'}
                          {money(Math.abs(entry.amount))}
                        </p>
                        <p className="mt-0.5 text-xs text-muted tabular-nums">
                          {format(d.wallet.history.balanceAfter, {
                            balance: money(entry.balanceAfter),
                          })}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
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
