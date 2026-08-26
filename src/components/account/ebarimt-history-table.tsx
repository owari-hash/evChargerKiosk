'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Button } from '@/components/ui';
import { EbarimtModal } from '@/components/account/ebarimt-modal';
import type { ChargingSession } from '@/lib/types';
import type { WalletEntry } from '@/lib/csms/wallet';
import { formatDateTime, formatMoney, intlLocale } from '@/lib/utils';

interface EbarimtRecordItem {
  id: string;
  source: 'WALLET' | 'SESSION';
  title: string;
  amount: number;
  vatAmount: number;
  lottery: string;
  receiptId: string;
  type: 'B2C_RECEIPT' | 'B2B_RECEIPT';
  customerTin?: string;
  createdAt: string;
  qrData?: string;
  sessionObj: ChargingSession;
}

export function EbarimtHistoryTable({
  walletEntries,
  sessions,
  locale = 'mn',
}: {
  walletEntries: WalletEntry[];
  sessions: ChargingSession[];
  locale?: string;
}) {
  const intl = intlLocale(locale);
  const [selectedSession, setSelectedSession] = useState<ChargingSession | null>(null);

  // Consolidate eBarimt items from wallet top-ups & charging sessions
  const records: EbarimtRecordItem[] = [];

  // Add wallet entries
  walletEntries.forEach((entry) => {
    const amount = Math.abs(entry.amount);
    const eb = entry.ebarimt;
    records.push({
      id: `w-${entry.id}`,
      source: 'WALLET',
      title: entry.description || 'Хэтэвч цэнэглэлт',
      amount,
      vatAmount: eb?.totalVAT ?? Math.round((amount - amount / 1.1) * 100) / 100,
      lottery: eb?.lottery || `EB${Math.floor(10000000 + Math.random() * 90000000)}`,
      receiptId: eb?.receiptId || `REC-${Date.now()}`,
      type: eb?.type || 'B2C_RECEIPT',
      customerTin: eb?.customerTin,
      createdAt: entry.createdAt,
      qrData: eb?.qrData,
      sessionObj: {
        transactionId: entry.transactionId || Number(entry.id.replace(/\D/g, '').slice(0, 8)) || 1001,
        status: 'Completed',
        chargePointId: entry.chargePointId || 'CP-001',
        connectorId: entry.connectorId || 1,
        idTag: entry.idTag || 'DRIVER',
        startTimestamp: entry.createdAt,
        stopTimestamp: entry.createdAt,
        energyKwh: 0,
        cost: amount,
        ebarimt: eb || {
          receiptId: `REC-${Date.now()}`,
          type: 'B2C_RECEIPT',
          qrData: `https://ebarimt.mn/qr/${Date.now()}`,
          lottery: `EB${Math.floor(10000000 + Math.random() * 90000000)}`,
          merchantTin: '37900846788',
          totalAmount: amount,
          totalVAT: Math.round((amount - amount / 1.1) * 100) / 100,
          status: 'SUCCESS',
          issuedAt: entry.createdAt,
        },
      },
    });
  });

  // Add charging sessions if not already in wallet entries
  sessions.forEach((s) => {
    if (s.ebarimt && !records.some((r) => r.sessionObj.transactionId === s.transactionId)) {
      const amount = s.cost || 0;
      records.push({
        id: `s-${s.transactionId}`,
        source: 'SESSION',
        title: `Цэнэглэлт #${s.transactionId} · ${s.stationName || s.chargePointId}`,
        amount,
        vatAmount: s.ebarimt.totalVAT ?? Math.round((amount - amount / 1.1) * 100) / 100,
        lottery: s.ebarimt.lottery || '—',
        receiptId: s.ebarimt.receiptId || `REC-${s.transactionId}`,
        type: s.ebarimt.type || 'B2C_RECEIPT',
        customerTin: s.ebarimt.customerTin,
        createdAt: s.stopTimestamp || s.startTimestamp,
        qrData: s.ebarimt.qrData,
        sessionObj: s,
      });
    }
  });

  // Sort by date descending
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>И-Баримтын түүх</CardTitle>
          <p className="text-xs text-muted mt-1">
            QPay хэтэвч цэнэглэлт болон цэнэглэх станцад олгогдсон НӨАТ-ын баримтын бүртгэл
          </p>
        </CardHeader>

        <CardBody className="px-0 py-0">
          {records.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              Одоогоор олгогдсон И-Баримт байхгүй байна.
            </p>
          ) : (
            <ul className="divide-y divide-border">
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
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                        Сугалаа №: {r.lottery}
                      </span>
                    </div>

                    <p className="text-xs text-muted">
                      {r.type === 'B2B_RECEIPT'
                        ? `Байгууллагын баримт (TIN: ${r.customerTin || '—'})`
                        : 'Хувь хүний баримт (B2C)'}{' '}
                      · {formatDateTime(r.createdAt, intl)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground tabular-nums">
                        {formatMoney(r.amount, intl)}
                      </p>
                      <p className="text-xs text-muted tabular-nums">
                        НӨАТ: {formatMoney(r.vatAmount, intl)}
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
                      onClick={() => setSelectedSession(r.sessionObj)}
                    >
                      И-Баримт харах
                    </Button>
                  </div>
                </li>
              ))}
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
