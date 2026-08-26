'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Button } from '@/components/ui';
import { EbarimtModal } from '@/components/account/ebarimt-modal';
import type { WalletEntry } from '@/lib/csms/wallet';
import type { ChargingSession } from '@/lib/types';
import type { Dictionary } from '@/lib/i18n';
import { format } from '@/lib/i18n';
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

                const dummySession: ChargingSession = {
                  transactionId: entry.transactionId || Number(entry.id.replace(/\D/g, '').slice(0, 8)) || 1001,
                  status: 'Completed',
                  chargePointId: entry.chargePointId || 'CP-001',
                  connectorId: entry.connectorId || 1,
                  idTag: entry.idTag || 'DRIVER',
                  startTimestamp: entry.createdAt,
                  stopTimestamp: entry.createdAt,
                  energyKwh: 0,
                  cost: Math.abs(entry.amount),
                  ebarimt: eb || {
                    receiptId: `REC-${Date.now()}`,
                    type: 'B2C_RECEIPT',
                    qrData: `https://ebarimt.mn/qr/${Date.now()}`,
                    lottery: `EB${Math.floor(10000000 + Math.random() * 90000000)}`,
                    merchantTin: '37900846788',
                    totalAmount: Math.abs(entry.amount),
                    totalVAT: Math.round((Math.abs(entry.amount) - Math.abs(entry.amount) / 1.1) * 100) / 100,
                    status: 'SUCCESS',
                    issuedAt: entry.createdAt,
                  },
                };

                return (
                  <li key={entry.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-surface-muted/30 transition">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {entry.description || d.wallet.history.type[entry.type]}
                        </p>
                        {eb && (
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                            ✓ И-Баримт {eb.lottery ? `(${eb.lottery})` : ''}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {d.wallet.history.type[entry.type]} ·{' '}
                        {formatDateTime(entry.createdAt, intl)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="text-xs font-medium"
                        onClick={() => setSelectedSession(dummySession)}
                      >
                        И-Баримт
                      </Button>

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
