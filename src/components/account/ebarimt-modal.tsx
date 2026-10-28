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

/** One line of the charge summary: label left, amount right. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums text-foreground">{value}</dd>
    </div>
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
  const [customerTin, setCustomerTin] = useState(
    session.ebarimt?.customerTin ?? session.ebarimtRequest?.customerTin ?? '',
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ebarimt, setEbarimt] = useState<EBarimtData | undefined>(session.ebarimt);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Organization auto-fetch state
  const [orgChecking, setOrgChecking] = useState(false);
  const [orgData, setOrgData] = useState<OrgCheckResult | null>(null);

  const isAlreadyIssued = Boolean(
    ebarimt &&
      ebarimt.status !== 'FAILED' &&
      (Boolean(ebarimt.receiptId) ||
        Boolean(ebarimt.lottery) ||
        Boolean(ebarimt.qrData) ||
        ebarimt.status === 'SUCCESS' ||
        ebarimt.status === 'REFUNDED')
  );

  useEffect(() => {
    setEbarimt(session.ebarimt);
    setType(initialType ?? session.ebarimt?.type ?? 'B2C_RECEIPT');
    setCustomerTin(session.ebarimt?.customerTin ?? session.ebarimtRequest?.customerTin ?? '');
    setError(null);
  }, [session, initialType]);

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
    if (isAlreadyIssued) return;
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
  }, [customerTin, type, isAlreadyIssued]);

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
    if (isAlreadyIssued) return;
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

      const res = await fetch(`/app-api/sessions/${session.transactionId}/ebarimt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: chosenType,
          customerTin: chosenType === 'B2B_RECEIPT' ? (orgData?.tin || customerTin.trim()) : undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { session?: ChargingSession; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'И-Баримт үүсгэж чадсангүй');
      if (data.session?.ebarimt) {
        setEbarimt(data.session.ebarimt);
        setType(data.session.ebarimt.type ?? chosenType);
        onSuccess?.(data.session);
      }
    } catch (err) {
      setError((err instanceof Error && err.message) || 'И-Баримт үүсгэхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }

  const isB2B = ebarimt?.type === 'B2B_RECEIPT';

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
        {/* Charging summary, laid out like a receipt */}
        <div className="overflow-hidden rounded-2xl border border-border">
          <dl className="divide-y divide-border/60 text-sm">
            <SummaryRow label="Цэнэглэсэн хэмжээ" value={formatKwh(session.energyKwh, 'mn')} />
            {session.feeAmount != null && session.feeAmount > 0 && (
              <>
                <SummaryRow
                  label="Эрчим хүчний төлбөр"
                  value={formatMoney(session.energyCost, 'mn')}
                />
                <SummaryRow
                  label={format(d.account.sessions.serviceFee, { percent: session.feePercent ?? '—' })}
                  value={formatMoney(session.feeAmount, 'mn')}
                />
              </>
            )}
          </dl>
          <div className="flex items-baseline justify-between gap-4 border-t border-border bg-surface-muted/50 px-4 py-3.5">
            <span className="text-sm text-muted">Нийт төлбөр</span>
            <span className="text-xl font-semibold tracking-tight tabular-nums text-foreground">
              {formatMoney(session.cost ?? 0, 'mn')}
            </span>
          </div>
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        {/* =========================================================================
            STATE 1: ALREADY GENERATED / ISSUED (READ-ONLY, PERMANENT, CANNOT SWITCH)
           ========================================================================= */}
        {isAlreadyIssued ? (
          <div className="space-y-3.5 text-center">
            {/* Locked Status Badge */}
            <div className="flex items-center justify-between rounded-xl bg-surface-muted/60 border border-border/50 px-3.5 py-2.5 text-xs">
              <span className="text-muted">Баримтын төлөв:</span>
              <span className="inline-flex items-center gap-1.5 text-foreground">
                {isB2B ? 'Байгууллага' : 'Хувь хүн'}
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Олгогдсон</span>
              </span>
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
                  <span>eBarimt аппликейшнээр уншуулах QR код</span>
                </div>
              </div>
            )}

            {/* Lottery Spotlight Card (if provided by PosAPI) */}
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
                  {isB2B
                    ? `Байгууллага (TIN: ${ebarimt?.customerTin || '—'})`
                    : 'Иргэн (B2C)'}
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

            <p className="text-[11px] text-muted text-center pt-0.5">
              Энэ баримт татварын системд баталгаажсан тул дахин өөрчлөх боломжгүй.
            </p>

            <Button type="button" variant="primary" onClick={onClose} className="w-full mt-2">
              Хаах
            </Button>
          </div>
        ) : (
          /* =========================================================================
              STATE 2: NOT GENERATED YET (USER CHOOSES B2C OR B2B)
             ========================================================================= */
          <div className="space-y-4">
            {/* Tab Selection: Хувь хүн (B2C) vs Байгууллага (B2B) */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1 text-sm">
              <button
                type="button"
                onClick={() => {
                  setType('B2C_RECEIPT');
                  setError(null);
                }}
                className={`rounded-lg py-2 transition ${
                  type === 'B2C_RECEIPT'
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Хувь хүн
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('B2B_RECEIPT');
                  setError(null);
                }}
                className={`rounded-lg py-2 transition ${
                  type === 'B2B_RECEIPT'
                    ? 'bg-surface text-foreground shadow-sm'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                Байгууллага
              </button>
            </div>

            {/* TAB 1: ХУВЬ ХҮН (B2C) */}
            {type === 'B2C_RECEIPT' && (
              <div className="space-y-3.5">
                <div className="rounded-xl bg-surface-muted/50 border border-border/50 p-3.5 text-xs text-muted leading-relaxed">
                  Цэнэглэлтийн төлбөрийн НӨАТ-ын буцаан олголт, сугалааны эрх бүхий хувь хүний баримт авна.
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                    Цуцлах
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => submit('B2C_RECEIPT')}
                    loading={loading}
                    className="flex-1"
                  >
                    Хувь хүнээр авах
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: БАЙГУУЛЛАГА (B2B) */}
            {type === 'B2B_RECEIPT' && (
              <div className="space-y-3.5">
                <div className="rounded-xl bg-surface-muted/50 border border-border/50 p-3 text-xs text-muted">
                  Байгууллагын зардалд суутгах албан ёсны НӨАТ-ын баримт авна.
                </div>

                <Field label="Байгууллагын ТТД / Регистрийн дугаар" htmlFor="b2b-customer-tin">
                  <Input
                    id="b2b-customer-tin"
                    placeholder="Жишээ: 55000864119 эсвэл 61101242402"
                    value={customerTin}
                    onChange={(e) => setCustomerTin(e.target.value)}
                  />
                </Field>

                {/* Live Organization Check Status */}
                {orgChecking && (
                  <div className="rounded-xl border border-border/60 bg-surface-muted/70 p-3 text-xs text-muted flex items-center gap-2">
                    <span className="size-3.5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    <span>Татварын системээс байгууллагын мэдээлэл шалгаж байна...</span>
                  </div>
                )}

                {orgData?.valid && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-foreground">{orgData.name}</span>
                      <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                        Баталгаажсан
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted text-xs">
                      <span>ТТД: <span className="tabular-nums text-foreground">{orgData.tin}</span></span>
                      <span>·</span>
                      <span>{orgData.vatPayer ? 'НӨАТ төлөгч' : 'НӨАТ төлөгч биш'}</span>
                    </div>
                  </div>
                )}

                {orgData && !orgData.valid && !orgChecking && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-600 dark:text-rose-400">
                    {orgData.error || 'Байгууллагын регистрийн дугаар хүчингүй байна'}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                    Цуцлах
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => submit('B2B_RECEIPT')}
                    loading={loading}
                    disabled={!orgData?.valid && customerTin.trim().length < 5}
                    className="flex-1"
                  >
                    Байгууллагаар авах
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
