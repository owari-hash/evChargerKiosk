'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { format, useI18n } from '@/components/i18n-provider';
import { Alert, Button, Field, Input, Modal, ModalHeader } from '@/components/ui';
import type { ChargingSession, EBarimtData } from '@/lib/types';
import { formatKwh, formatMoney } from '@/lib/utils';

export interface EbarimtModalProps {
  session: ChargingSession;
  onClose: () => void;
  onSuccess?: (updated: ChargingSession) => void;
}

function CheckIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CopyIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function ScanIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}

export function EbarimtModal({ session, onClose, onSuccess }: EbarimtModalProps) {
  const { d } = useI18n();
  const [type, setType] = useState<'B2C_RECEIPT' | 'B2B_RECEIPT'>(
    session.ebarimt?.type ?? 'B2C_RECEIPT',
  );
  const [customerTin, setCustomerTin] = useState(session.ebarimt?.customerTin ?? '');
  const [customerNo, setCustomerNo] = useState(session.ebarimt?.customerNo ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ebarimt, setEbarimt] = useState<EBarimtData | undefined>(session.ebarimt);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const qrText = ebarimt?.qrData;
    if (!qrText) {
      setQrDataUrl(null);
      return;
    }

    let active = true;
    QRCode.toDataURL(qrText, {
      margin: 1,
      width: 240,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) {
          setQrDataUrl(
            `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=2&data=${encodeURIComponent(
              qrText,
            )}`,
          );
        }
      });

    return () => {
      active = false;
    };
  }, [ebarimt?.qrData]);

  async function copyText(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // ignore
    }
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      if (type === 'B2B_RECEIPT' && (!customerTin || customerTin.trim().length < 5)) {
        throw new Error('Байгууллагын регистрийн дугаарыг оруулна уу');
      }

      if (type === 'B2C_RECEIPT' && customerNo.trim()) {
        const cleanNo = customerNo.trim();
        if (!/^\d{8}$/.test(cleanNo)) {
          throw new Error('И-Баримтын хэрэглэгчийн код яг 8 оронтой тоо байх ёстой (жишээ нь: 12809800)');
        }
        const bogus = [
          '00000000',
          '11111111',
          '22222222',
          '33333333',
          '44444444',
          '55555555',
          '66666666',
          '77777777',
          '88888888',
          '99999999',
          '12345678',
          '87654321',
        ];
        if (bogus.includes(cleanNo)) {
          throw new Error('Хүчингүй код байна. Өөрийн Ebarimt систем дэх бодит 8 оронтой кодоо оруулна уу.');
        }
      }

      const res = await fetch(`/app-api/sessions/${session.transactionId}/ebarimt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          customerTin: type === 'B2B_RECEIPT' ? customerTin.trim() : undefined,
          customerNo: type === 'B2C_RECEIPT' ? customerNo.trim() || undefined : undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { session?: ChargingSession; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'И-Баримт үүсгэж чадсангүй');
      if (data.session?.ebarimt) {
        setEbarimt(data.session.ebarimt);
        onSuccess?.(data.session);
      }
    } catch (err) {
      setError((err instanceof Error && err.message) || 'И-Баримт үүсгэхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} maxWidth="md">
      <ModalHeader
        title="И-Баримт олгох"
        subtitle={session.stationName || `Цэнэглэлт #${session.transactionId}`}
        onClose={onClose}
        icon={
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand" aria-hidden>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zm3 5h6M9 11h6M9 14h4" />
            </svg>
          </span>
        }
      />

      <div className="space-y-4 px-5 sm:px-6 py-5">
        {/* Charging Summary Box */}
        <div className="rounded-2xl bg-surface-muted/70 border border-border/60 p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted">Хэрэглэсэн эрчим хүч:</span>
            <span className="font-semibold text-foreground font-mono">{formatKwh(session.energyKwh, 'mn')}</span>
          </div>
          {session.feeAmount != null && session.feeAmount > 0 && (
            <>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted">{d.account.sessions.energyCost}:</span>
                <span className="font-semibold text-foreground font-mono">
                  {formatMoney(session.energyCost, 'mn')}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-muted">
                  {format(d.account.sessions.serviceFee, { percent: session.feePercent ?? '—' })}:
                </span>
                <span className="font-semibold text-foreground font-mono">
                  {formatMoney(session.feeAmount, 'mn')}
                </span>
              </div>
            </>
          )}
          <div className="mt-2.5 pt-2.5 flex items-center justify-between border-t border-border/60">
            <span className="font-medium text-foreground">Нийт төлбөр:</span>
            <span className="text-base font-bold text-brand-strong font-mono">{formatMoney(session.cost ?? 0, 'mn')}</span>
          </div>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        {ebarimt?.status === 'SUCCESS' ? (
          <div className="space-y-3.5 text-center">
            {/* Premium QR Code Container: Pure white card with quiet zone and frame targeting */}
            {ebarimt.qrData && (
              <div className="flex flex-col items-center justify-center py-1">
                <div className="relative rounded-2xl bg-white p-3.5 sm:p-4 shadow-xl shadow-black/30 ring-1 ring-black/5 flex items-center justify-center">
                  {/* Subtle target bracket corners */}
                  <div className="absolute top-2.5 left-2.5 size-3 border-t-2 border-l-2 border-emerald-500/60 rounded-tl-[3px] pointer-events-none" />
                  <div className="absolute top-2.5 right-2.5 size-3 border-t-2 border-r-2 border-emerald-500/60 rounded-tr-[3px] pointer-events-none" />
                  <div className="absolute bottom-2.5 left-2.5 size-3 border-b-2 border-l-2 border-emerald-500/60 rounded-bl-[3px] pointer-events-none" />
                  <div className="absolute bottom-2.5 right-2.5 size-3 border-b-2 border-r-2 border-emerald-500/60 rounded-br-[3px] pointer-events-none" />

                  {/* Sharp, unclipped QR code */}
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="eBarimt QR Code"
                      width={180}
                      height={180}
                      className="size-44 sm:size-48 object-contain rounded-none select-none"
                    />
                  ) : (
                    <div className="size-44 sm:size-48 flex items-center justify-center bg-slate-50 text-slate-400">
                      <ScanIcon className="size-8 animate-pulse text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-surface-muted/80 border border-border/60 px-3 py-1 text-[11px] text-muted">
                  <ScanIcon className="size-3 text-brand" />
                  <span>eBarimt аппликейшнээр уншуулах QR код</span>
                </div>
              </div>
            )}

            {/* Lottery Number Spotlight Card */}
            {ebarimt.lottery && (
              <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 via-brand-soft to-emerald-500/5 border border-emerald-500/20 p-3 sm:p-3.5 flex items-center justify-between shadow-sm text-left">
                <div>
                  <div className="text-[10px] font-bold tracking-wider uppercase text-muted">
                    Сугалааны дугаар
                  </div>
                  <div className="font-mono text-xl sm:text-2xl font-extrabold tracking-widest text-emerald-400 mt-0.5 select-all">
                    {ebarimt.lottery}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(ebarimt.lottery!, 'lottery')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-muted border border-border text-xs font-medium text-foreground transition active:scale-95 shadow-sm"
                >
                  {copiedField === 'lottery' ? (
                    <>
                      <CheckIcon className="size-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">Хуулагдлаа</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-3.5 text-muted" />
                      <span>Хуулах</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 2-Column Receipt Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-left text-xs">
              <div className="rounded-xl bg-surface-muted/60 border border-border/50 p-2.5">
                <span className="text-[11px] text-muted">НӨАТ-ын дүн</span>
                <div className="font-bold text-foreground font-mono mt-0.5">
                  {formatMoney(ebarimt.totalVAT, 'mn')}
                </div>
              </div>
              <div className="rounded-xl bg-surface-muted/60 border border-border/50 p-2.5">
                <span className="text-[11px] text-muted">Баримтын төрөл</span>
                <div className="font-medium text-foreground mt-0.5">
                  {ebarimt.type === 'B2B_RECEIPT' ? 'Байгууллага (B2B)' : 'Иргэн (B2C)'}
                </div>
              </div>
              {ebarimt.receiptId && (
                <div className="col-span-2 rounded-xl bg-surface-muted/60 border border-border/50 p-2.5 flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-[11px] text-muted">ДДТД / Баримтын №</span>
                    <div className="font-mono text-[11px] text-foreground truncate mt-0.5 select-all" title={ebarimt.receiptId}>
                      {ebarimt.receiptId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(ebarimt.receiptId!, 'receiptId')}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-surface text-muted hover:text-foreground transition active:scale-95"
                    title="ДДТД хуулах"
                  >
                    {copiedField === 'receiptId' ? (
                      <CheckIcon className="size-3.5 text-emerald-500" />
                    ) : (
                      <CopyIcon className="size-3.5" />
                    )}
                  </button>
                </div>
              )}
            </div>

            <Button type="button" variant="primary" onClick={onClose} className="w-full mt-1">
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

            {type === 'B2C_RECEIPT' && (
              <Field label="И-Баримтын код (Хялбар бүртгэл)" htmlFor="b2c-customer-no">
                <Input
                  id="b2c-customer-no"
                  placeholder="8 оронтой код эсвэл утасны дугаар"
                  value={customerNo}
                  onChange={(e) => setCustomerNo(e.target.value)}
                />
              </Field>
            )}

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
    </Modal>
  );
}
