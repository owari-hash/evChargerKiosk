'use client';

import { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Button } from '@/components/ui';
import { EbarimtModal } from '@/components/account/ebarimt-modal';
import { format, useI18n } from '@/components/i18n-provider';
import type { ChargingSession, WalletEntry } from '@/lib/types';
import { formatDateTime, formatMoney, intlLocale } from '@/lib/utils';

interface EbarimtRecordItem {
  id: string;
  source: 'WALLET' | 'SESSION';
  title: string;
  amount: number;
  vatAmount: number;
  lottery: string;
  receiptId?: string;
  type: 'B2C_RECEIPT' | 'B2B_RECEIPT';
  customerTin?: string;
  createdAt: string;
  qrData?: string;
  isIssued: boolean;
  sessionObj: ChargingSession;
}

export function EbarimtHistoryTable({
  walletEntries,
  sessions,
}: {
  walletEntries: WalletEntry[];
  sessions: ChargingSession[];
}) {
  const { d, locale } = useI18n();
  const t = d.account.ebarimt;
  const intl = intlLocale(locale);
  const [sessionList, setSessionList] = useState<ChargingSession[]>(sessions);
  const [selectedSession, setSelectedSession] = useState<ChargingSession | null>(null);

  useEffect(() => {
    setSessionList(sessions);
  }, [sessions]);

  // Consolidate eBarimt items from wallet top-ups & charging sessions
  const records: EbarimtRecordItem[] = [];

  // Add wallet entries — only those the PosAPI actually issued a receipt for.
  walletEntries.forEach((entry) => {
    const eb = entry.ebarimt;
    if (!(eb?.receiptId || eb?.lottery) || (eb.status !== 'SUCCESS' && eb.status !== 'REFUNDED')) return;
    const amount = Math.abs(entry.amount);
    records.push({
      id: `w-${entry.id}`,
      source: 'WALLET',
      title: entry.description || t.walletTopup,
      amount,
      vatAmount: eb.totalVAT,
      lottery: eb.lottery || '—',
      receiptId: eb.receiptId,
      type: eb.type || 'B2C_RECEIPT',
      customerTin: eb.customerTin,
      createdAt: entry.createdAt,
      qrData: eb.qrData,
      isIssued: true,
      sessionObj: {
        transactionId: entry.transactionId ?? 0,
        status: 'Completed',
        chargePointId: entry.chargePointId ?? '',
        connectorId: entry.connectorId ?? 0,
        idTag: entry.idTag ?? '',
        startTimestamp: entry.createdAt,
        stopTimestamp: entry.createdAt,
        energyKwh: 0,
        cost: amount,
        ebarimt: eb,
      },
    });
  });

  // Add charging sessions (both issued and unissued completed sessions)
  sessionList.forEach((s) => {
    if (s.status !== 'Completed' || !(s.cost && s.cost > 0)) return;
    if (records.some((r) => r.sessionObj.transactionId === s.transactionId)) return;

    const issued = Boolean(
      s.ebarimt &&
      s.ebarimt.status !== 'FAILED' &&
      (Boolean(s.ebarimt.receiptId) ||
        Boolean(s.ebarimt.lottery) ||
        Boolean(s.ebarimt.qrData) ||
        s.ebarimt.status === 'SUCCESS' ||
        s.ebarimt.status === 'REFUNDED')
    );

    const amount = s.cost || 0;
    records.push({
      id: `s-${s.transactionId}`,
      source: 'SESSION',
      title: format(t.sessionTitle, {
        id: s.transactionId,
        station: s.stationName || s.chargePointId,
      }),
      amount,
      vatAmount: s.ebarimt?.totalVAT ?? Math.round((amount - amount / 1.1) * 100) / 100,
      lottery: s.ebarimt?.lottery || '',
      receiptId: s.ebarimt?.receiptId,
      type: s.ebarimt?.type || 'B2C_RECEIPT',
      customerTin: s.ebarimt?.customerTin,
      createdAt: s.stopTimestamp || s.startTimestamp,
      qrData: s.ebarimt?.qrData,
      isIssued: issued,
      sessionObj: s,
    });
  });

  // Sort by date descending
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <p className="text-xs text-muted mt-1">{t.subtitle}</p>
        </CardHeader>

        <CardBody className="px-0 py-0">
          {records.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">{t.empty}</p>
          ) : (
            <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {records.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 hover:bg-surface-muted/30 transition"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {r.title}
                      </span>
                      {r.isIssued ? (
                        <>
                          {r.lottery ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                              {format(t.lotteryLabel, { id: r.lottery })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                              🏢 Байгууллага
                            </span>
                          )}
                          {r.sessionObj.ebarimt?.status === 'REFUNDED' && (
                            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
                              {t.refundedLabel}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20">
                          {t.unissuedLabel || 'Баримт аваагүй'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted">
                      {r.isIssued
                        ? `${r.type === 'B2B_RECEIPT' ? format(t.b2bLabel, { tin: r.customerTin || '—' }) : t.b2cLabel} · ${formatDateTime(r.createdAt, intl)}`
                        : `${t.unissuedDesc || 'Баримт үүсээгүй байна'} · ${formatDateTime(r.createdAt, intl)}`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground tabular-nums">
                        {formatMoney(r.amount, intl)}
                      </p>
                      <p className="text-xs text-muted tabular-nums">
                        {format(t.vatLabel, { amount: formatMoney(r.vatAmount, intl) })}
                      </p>
                    </div>

                    {r.isIssued ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="font-semibold text-xs shadow-sm"
                        onClick={() => setSelectedSession(r.sessionObj)}
                      >
                        {t.viewButton}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                        onClick={() => setSelectedSession(r.sessionObj)}
                      >
                        {t.getButton || 'И-Баримт авах'}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {selectedSession && (
        <EbarimtModal
          key={`eb-modal-${selectedSession.transactionId || selectedSession.idTag || 'sel'}`}
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onSuccess={(updated) => {
            setSessionList((prev) =>
              prev.map((s) => (s.transactionId === updated.transactionId ? updated : s)),
            );
            setSelectedSession(updated);
          }}
        />
      )}
    </>
  );
}
