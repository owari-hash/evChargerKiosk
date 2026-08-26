'use client';

import { useState } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import type { ChargingSession, EBarimtData } from '@/lib/types';
import { formatKwh, formatMoney } from '@/lib/utils';

export interface EbarimtModalProps {
  session: ChargingSession;
  onClose: () => void;
  onSuccess?: (updated: ChargingSession) => void;
}

export function EbarimtModal({ session, onClose, onSuccess }: EbarimtModalProps) {
  const [type, setType] = useState<'B2C_RECEIPT' | 'B2B_RECEIPT'>(
    session.ebarimt?.type ?? 'B2C_RECEIPT',
  );
  const [customerTin, setCustomerTin] = useState(session.ebarimt?.customerTin ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ebarimt, setEbarimt] = useState<EBarimtData | undefined>(session.ebarimt);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      if (type === 'B2B_RECEIPT' && (!customerTin || customerTin.trim().length < 5)) {
        throw new Error('Байгууллагын регистрийн дугаарыг оруулна уу');
      }

      const res = await fetch(`/app-api/sessions/${session.transactionId}/ebarimt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          customerTin: type === 'B2B_RECEIPT' ? customerTin.trim() : undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { session?: ChargingSession; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'И-Баримт үүсгэж чадсангүй');
      if (data.session?.ebarimt) {
        setEbarimt(data.session.ebarimt);
        onSuccess?.(data.session);
      }
    } catch (err: any) {
      setError(err?.message || 'И-Баримт үүсгэхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  const qrUrl = ebarimt?.qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(ebarimt.qrData)}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface p-6 shadow-2xl ring-1 ring-border">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">И-Баримт олгох</h3>
            <p className="text-xs text-muted">
              {session.stationName || `Цэнэглэлт #${session.transactionId}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition hover:bg-surface-muted hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-surface-muted p-3 text-xs text-muted">
            <div className="flex justify-between py-1">
              <span>Хэрэглэсэн эрчим хүч:</span>
              <span className="font-semibold text-foreground">{formatKwh(session.energyKwh, 'mn')}</span>
            </div>
            <div className="flex justify-between py-1 border-t border-border/50 pt-1">
              <span>Нийт төлбөр:</span>
              <span className="font-bold text-brand-strong">{formatMoney(session.cost ?? 0, 'mn')}</span>
            </div>
          </div>

          {error && <Alert tone="danger">{error}</Alert>}

          {ebarimt?.status === 'SUCCESS' ? (
            <div className="space-y-4 text-center">
              <Alert tone="success" title="И-Баримт амжилттай олгогдлоо!">
                {ebarimt.type === 'B2B_RECEIPT'
                  ? `Байгууллагын регистрт (${ebarimt.customerTin}) бүртгэгдлээ.`
                  : 'Хувь хүний И-Баримт амжилттай үүслээ.'}
              </Alert>

              {qrUrl && (
                <div className="flex flex-col items-center justify-center p-2">
                  <img src={qrUrl} alt="eBarimt QR Code" className="h-40 w-40 rounded-xl ring-1 ring-border" />
                  <p className="mt-2 text-[11px] text-muted">eBarimt аппликейшнээр уншуулах QR код</p>
                </div>
              )}

              <dl className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-3 text-left text-xs">
                <div>
                  <dt className="text-muted">Сугалааны №</dt>
                  <dd className="font-mono font-bold text-foreground">{ebarimt.lottery || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted">НӨАТ-ын дүн</dt>
                  <dd className="font-bold text-foreground">{formatMoney(ebarimt.totalVAT, 'mn')}</dd>
                </div>
                <div>
                  <dt className="text-muted">Төрөл</dt>
                  <dd className="font-medium text-foreground">
                    {ebarimt.type === 'B2B_RECEIPT' ? 'Байгууллага (B2B)' : 'Иргэн (B2C)'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Баримтын №</dt>
                  <dd className="font-mono text-muted truncate">{ebarimt.receiptId || '—'}</dd>
                </div>
              </dl>

              <Button type="button" variant="secondary" onClick={onClose} className="w-full">
                Хаах
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setType('B2C_RECEIPT')}
                  className={`rounded-lg py-2 font-medium transition ${
                    type === 'B2C_RECEIPT'
                      ? 'bg-surface font-bold text-foreground shadow-sm'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Иргэн (B2C)
                </button>
                <button
                  type="button"
                  onClick={() => setType('B2B_RECEIPT')}
                  className={`rounded-lg py-2 font-medium transition ${
                    type === 'B2B_RECEIPT'
                      ? 'bg-surface font-bold text-foreground shadow-sm'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  Байгууллага (B2B)
                </button>
              </div>

              {type === 'B2B_RECEIPT' && (
                <Field label="Байгууллагын регистрийн дугаар" htmlFor="b2b-tin">
                  <Input
                    id="b2b-tin"
                    placeholder="Дүүрэг / ААН-ийн Регистр (жишээ: 6123456)"
                    value={customerTin}
                    onChange={(e) => setCustomerTin(e.target.value)}
                  />
                </Field>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                  Цуцлах
                </Button>
                <Button type="button" onClick={submit} loading={loading} className="flex-1">
                  И-Баримт үүсгэх
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
