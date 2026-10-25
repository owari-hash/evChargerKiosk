'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { format, useI18n } from '@/components/i18n-provider';
import { Alert, Button, Field, Input, Modal, ModalHeader } from '@/components/ui';
import type { ChargingSession, EBarimtData } from '@/lib/types';
import { formatKwh, formatMoney } from '@/lib/utils';

export interface EbarimtModalProps {
  session: ChargingSession;
  initialType?: 'B2C_RECEIPT' | 'B2B_RECEIPT';
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

interface OrgCheckResult {
  valid?: boolean;
  name?: string;
  tin?: string;
  vatPayer?: boolean;
  error?: string;
}

export function EbarimtModal({ session, initialType, onClose, onSuccess }: EbarimtModalProps) {
  const { d } = useI18n();
  const [type, setType] = useState<'B2C_RECEIPT' | 'B2B_RECEIPT'>(
    initialType ?? session.ebarimt?.type ?? 'B2C_RECEIPT',
  );
  const [customerTin, setCustomerTin] = useState(session.ebarimt?.customerTin ?? '');
  const [customerNo, setCustomerNo] = useState(session.ebarimt?.customerNo ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ebarimt, setEbarimt] = useState<EBarimtData | undefined>(session.ebarimt);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Organization auto-fetch state
  const [orgChecking, setOrgChecking] = useState(false);
  const [orgData, setOrgData] = useState<OrgCheckResult | null>(null);
  const [isEditingB2B, setIsEditingB2B] = useState(false);

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

  // Debounced live organization register verification via original ebarimt API
  useEffect(() => {
    const clean = customerTin.trim();
    if (type !== 'B2B_RECEIPT' || clean.length < 5) {
      setOrgData(null);
      setOrgChecking(false);
      return;
    }

    let active = true;
    setOrgChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/app-api/sessions/ebarimt/check-org/${encodeURIComponent(clean)}`);
        const data = await res.json().catch(() => null);
        if (!active) return;
        if (res.ok && data?.result) {
          setOrgData(data.result);
        } else if (res.ok && data?.valid !== undefined) {
          setOrgData(data);
        } else {
          setOrgData({ valid: false, error: data?.error || 'Татварын системд байгууллага олдсонгүй' });
        }
      } catch {
        if (active) {
          setOrgData({ valid: false, error: 'Байгууллага шалгахад алдаа гарлаа' });
        }
      } finally {
        if (active) setOrgChecking(false);
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerTin, type]);

  async function copyText(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // ignore
    }
  }

  async function submit(targetType?: 'B2C_RECEIPT' | 'B2B_RECEIPT') {
    const chosenType = targetType ?? type;
    setLoading(true);
    setError(null);
    try {
      if (chosenType === 'B2B_RECEIPT') {
        const tinToUse = orgData?.tin || customerTin.trim();
        if (!tinToUse || tinToUse.length < 5) {
          throw new Error('Байгууллагын регистрийн дугаарыг оруулна уу');
        }
        if (orgData && !orgData.valid) {
          throw new Error(orgData.error || 'Байгууллагын регистрийн дугаар хүчингүй байна');
        }
      }

      if (chosenType === 'B2C_RECEIPT' && customerNo.trim()) {
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
          type: chosenType,
          customerTin: chosenType === 'B2B_RECEIPT' ? (orgData?.tin || customerTin.trim()) : undefined,
          customerNo: chosenType === 'B2C_RECEIPT' ? customerNo.trim() || undefined : undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { session?: ChargingSession; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'И-Баримт үүсгэж чадсангүй');
      if (data.session?.ebarimt) {
        setEbarimt(data.session.ebarimt);
        setType(data.session.ebarimt.type ?? chosenType);
        setIsEditingB2B(false);
        onSuccess?.(data.session);
      }
    } catch (err) {
      setError((err instanceof Error && err.message) || 'И-Баримт үүсгэхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  const isCurrentB2B = ebarimt?.status === 'SUCCESS' && ebarimt.type === 'B2B_RECEIPT';
  const isCurrentB2C = ebarimt?.status === 'SUCCESS' && ebarimt.type !== 'B2B_RECEIPT';

  return (
    <Modal onClose={onClose} maxWidth="md">
      <ModalHeader
        title="И-Баримт"
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

        {/* Tab Selection: Хувь хүн (B2C) vs Байгууллага (B2B) */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setType('B2C_RECEIPT');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              type === 'B2C_RECEIPT'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <span>👤</span>
            <span>Хувь хүн (B2C)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setType('B2B_RECEIPT');
              setError(null);
            }}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${
              type === 'B2B_RECEIPT'
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <span>🏢</span>
            <span>Байгууллага (B2B)</span>
          </button>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        {/* ----------------- TAB 1: ХУВЬ ХҮН (B2C) ----------------- */}
        {type === 'B2C_RECEIPT' && (
          <>
            {isCurrentB2C ? (
              <div className="space-y-3.5 text-center">
                {/* QR Code Container */}
                {ebarimt?.qrData && (
                  <div className="flex flex-col items-center justify-center py-1">
                    <div className="relative rounded-2xl bg-white p-3.5 sm:p-4 shadow-xl shadow-black/30 ring-1 ring-black/5 flex items-center justify-center">
                      <div className="absolute top-2.5 left-2.5 size-3 border-t-2 border-l-2 border-emerald-500/60 rounded-tl-[3px] pointer-events-none" />
                      <div className="absolute top-2.5 right-2.5 size-3 border-t-2 border-r-2 border-emerald-500/60 rounded-tr-[3px] pointer-events-none" />
                      <div className="absolute bottom-2.5 left-2.5 size-3 border-b-2 border-l-2 border-emerald-500/60 rounded-bl-[3px] pointer-events-none" />
                      <div className="absolute bottom-2.5 right-2.5 size-3 border-b-2 border-r-2 border-emerald-500/60 rounded-br-[3px] pointer-events-none" />

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

                {/* Lottery Spotlight Card */}
                {ebarimt?.lottery && (
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

                {/* Receipt Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-left text-xs">
                  <div className="rounded-xl bg-surface-muted/60 border border-border/50 p-2.5">
                    <span className="text-[11px] text-muted">НӨАТ-ын дүн</span>
                    <div className="font-bold text-foreground font-mono mt-0.5">
                      {formatMoney(ebarimt?.totalVAT, 'mn')}
                    </div>
                  </div>
                  <div className="rounded-xl bg-surface-muted/60 border border-border/50 p-2.5">
                    <span className="text-[11px] text-muted">Баримтын төрөл</span>
                    <div className="font-medium text-foreground mt-0.5">
                      Иргэн (B2C)
                    </div>
                  </div>
                  {ebarimt?.receiptId && (
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

                {/* Switch to Organization Notice */}
                <div className="rounded-xl bg-surface-muted/60 border border-border/50 p-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted">
                    <span>🏢</span>
                    <span>Байгууллагаар авах уу?</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setType('B2B_RECEIPT')}
                    className="text-xs h-7 px-3 text-brand"
                  >
                    Байгууллагаар авах
                  </Button>
                </div>

                <Button type="button" variant="primary" onClick={onClose} className="w-full mt-1">
                  Хаах
                </Button>
              </div>
            ) : isCurrentB2B ? (
              <div className="space-y-3.5 text-center">
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-left text-amber-700 dark:text-amber-300">
                  <p className="font-medium">
                    Одоогоор энэ цэнэглэлтэд <strong>Байгууллагын (B2B)</strong> баримт олгогдсон байна.
                  </p>
                  <p className="mt-1 text-[11px] opacity-80">
                    Хэрэв та хувийн Иргэний баримт болгож өөрчлөх бол доорх товчийг дарна уу.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                    Хаах
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => submit('B2C_RECEIPT')}
                    loading={loading}
                    className="flex-1"
                  >
                    👤 Хувь хүн рүү шилжүүлэх
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <Field label="И-Баримтын код (Хялбар бүртгэл)" htmlFor="b2c-customer-no">
                  <Input
                    id="b2c-customer-no"
                    placeholder="8 оронтой код эсвэл утасны дугаар"
                    value={customerNo}
                    onChange={(e) => setCustomerNo(e.target.value)}
                  />
                </Field>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                    Цуцлах
                  </Button>
                  <Button type="button" onClick={() => submit('B2C_RECEIPT')} loading={loading} className="flex-1">
                    И-Баримт үүсгэх
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ----------------- TAB 2: БАЙГУУЛЛАГА (B2B) ----------------- */}
        {type === 'B2B_RECEIPT' && (
          <>
            {isCurrentB2B && !isEditingB2B ? (
              <div className="space-y-3.5 text-center">
                {/* Organization Active Banner */}
                <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 via-brand-soft/30 to-emerald-500/5 border border-emerald-500/30 p-3 text-xs flex items-center justify-between text-left">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>🏢</span> Байгууллагын баримт олгогдсон
                    </div>
                    <div className="font-mono text-sm font-bold text-foreground mt-0.5">
                      ТТД / Регистр: {ebarimt?.customerTin}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingB2B(true)}
                    className="text-xs text-brand hover:underline h-7 px-2"
                  >
                    Өөрчлөх
                  </Button>
                </div>

                {/* QR Code Container */}
                {ebarimt?.qrData && (
                  <div className="flex flex-col items-center justify-center py-1">
                    <div className="relative rounded-2xl bg-white p-3.5 sm:p-4 shadow-xl shadow-black/30 ring-1 ring-black/5 flex items-center justify-center">
                      <div className="absolute top-2.5 left-2.5 size-3 border-t-2 border-l-2 border-emerald-500/60 rounded-tl-[3px] pointer-events-none" />
                      <div className="absolute top-2.5 right-2.5 size-3 border-t-2 border-r-2 border-emerald-500/60 rounded-tr-[3px] pointer-events-none" />
                      <div className="absolute bottom-2.5 left-2.5 size-3 border-b-2 border-l-2 border-emerald-500/60 rounded-bl-[3px] pointer-events-none" />
                      <div className="absolute bottom-2.5 right-2.5 size-3 border-b-2 border-r-2 border-emerald-500/60 rounded-br-[3px] pointer-events-none" />

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
                      <span>Байгууллагын eBarimt QR код</span>
                    </div>
                  </div>
                )}

                {/* Lottery Spotlight Card */}
                {ebarimt?.lottery && (
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

                {/* Receipt Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-left text-xs">
                  <div className="rounded-xl bg-surface-muted/60 border border-border/50 p-2.5">
                    <span className="text-[11px] text-muted">НӨАТ-ын дүн</span>
                    <div className="font-bold text-foreground font-mono mt-0.5">
                      {formatMoney(ebarimt?.totalVAT, 'mn')}
                    </div>
                  </div>
                  <div className="rounded-xl bg-surface-muted/60 border border-border/50 p-2.5">
                    <span className="text-[11px] text-muted">Баримтын төрөл</span>
                    <div className="font-medium text-foreground mt-0.5">
                      Байгууллага (B2B)
                    </div>
                  </div>
                  {ebarimt?.receiptId && (
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
              /* Organization Register Entry & Real-time Auto-fetch Form */
              <div className="space-y-3.5">
                <Field label="Байгууллагын регистрийн дугаар / ТТД" htmlFor="b2b-tin">
                  <Input
                    id="b2b-tin"
                    placeholder="Жишээ: 55000864119 эсвэл 7 оронтой регистр"
                    value={customerTin}
                    onChange={(e) => setCustomerTin(e.target.value)}
                    autoFocus
                  />
                </Field>

                {/* Auto-check status card */}
                {orgChecking && (
                  <div className="flex items-center gap-2 rounded-xl bg-surface-muted/80 border border-border/60 p-3 text-xs text-muted animate-pulse">
                    <svg className="size-4 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Татварын системээс байгууллагын мэдээлэл шалгаж байна...</span>
                  </div>
                )}

                {!orgChecking && orgData?.valid && orgData.name && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-left">
                    <span className="text-xl">🏢</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-foreground truncate">{orgData.name}</div>
                      <div className="text-[11px] text-muted font-mono mt-0.5">
                        ТТД: {orgData.tin} {orgData.vatPayer ? '· НӨАТ төлөгч' : '· НӨАТ төлөгч биш'}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 rounded-md px-2 py-0.5 shrink-0">
                      <CheckIcon className="size-3 text-emerald-500" />
                      Баталгаажсан
                    </span>
                  </div>
                )}

                {!orgChecking && orgData && !orgData.valid && (
                  <div className="rounded-xl bg-danger/10 border border-danger/30 p-2.5 text-xs text-danger text-left flex items-center gap-2">
                    <span className="text-base">⚠</span>
                    <span>{orgData.error || 'Татварын ерөнхий газрын бүртгэлд олдсонгүй.'}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {isEditingB2B && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setIsEditingB2B(false)}
                      className="flex-1"
                    >
                      Буцах
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => submit('B2B_RECEIPT')}
                    loading={loading}
                    disabled={!orgData?.valid || orgChecking || loading}
                    className="flex-1"
                  >
                    🏢 Байгууллагын баримт авах
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
