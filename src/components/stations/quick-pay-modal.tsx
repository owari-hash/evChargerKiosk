'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert, Button, Modal, ModalHeader } from '@/components/ui';

interface QuickPayModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  defaultAmount?: number;
}

interface DeepLink {
  name: string;
  link: string;
  logo?: string;
}

interface Invoice {
  id: string;
  amount: number;
  qrText?: string;
  qrImage?: string;
  shortUrl?: string;
  deeplinks?: DeepLink[];
  status?: string;
}

const PRESETS = [5000, 10000, 20000, 50000];
const POLL_MS = 2500;

export function QuickPayModal({
  open,
  onClose,
  onSuccess,
  defaultAmount = 10000,
}: QuickPayModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(defaultAmount);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const activeAmount = customAmount ? Number(customAmount) : selectedAmount;

  async function handleCreateInvoice(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!activeAmount || activeAmount < 1000) {
      setError('Хамгийн багадаа 1,000₮ сонгоно уу');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/app-api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: activeAmount }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        invoice?: Invoice;
        error?: string;
      };

      if (!res.ok || !data.invoice) {
        throw new Error(data.error || 'Нэхэмжлэх үүсгэж чадсангүй');
      }

      setInvoice(data.invoice);
      setPolling(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа');
    } finally {
      setCreating(false);
    }
  }

  // Poll for payment completion
  const checkStatus = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/app-api/wallet/topup/${encodeURIComponent(id)}`);
      const data = (await res.json().catch(() => ({}))) as {
        paid?: boolean;
        wallet?: { balance: number };
        invoice?: Invoice;
      };

      if (data.paid) {
        setPaid(true);
        setPolling(false);
        const bal = data.wallet?.balance ?? activeAmount;
        setTimeout(() => {
          onSuccess(bal);
        }, 1200);
      }
    } catch {
      // transient network glitch
    }
  }, [activeAmount, onSuccess]);

  useEffect(() => {
    if (!invoice?.id || !polling) return;
    const interval = setInterval(() => {
      void checkStatus(invoice.id);
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [invoice?.id, polling, checkStatus]);

  function handleReset() {
    setInvoice(null);
    setPaid(false);
    setPolling(false);
    setError(null);
  }

  if (!open) return null;

  return (
    <Modal onClose={onClose} maxWidth="md">
      <ModalHeader title="Хэтэвч цэнэглэх (QPay)" onClose={onClose} />

      <div className="p-4 sm:p-5">
        {paid ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-600 text-2xl font-bold dark:bg-emerald-950 dark:text-emerald-400">
              ✓
            </div>
            <h3 className="text-lg font-bold text-foreground">Төлбөр амжилттай баталгаажлаа!</h3>
            <p className="text-sm text-muted">
              {activeAmount.toLocaleString('mn-MN')}₮ таны хэтэвчинд орлоо. Цэнэглэлт эхэлж байна...
            </p>
          </div>
        ) : !invoice ? (
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <p className="text-xs text-muted leading-relaxed">
              Таны төлсөн дүн таны утасны дугаарын хэтэвчинд байрших бөгөөд машинаа дутуу цэнэглэсэн ч 
              <strong> үлдэгдэл мөнгө тань хэзээ ч алдагдахгүй, дараагийн цэнэглэлтэд хадгалагдана</strong>.
            </p>

            <div>
              <label className="text-xs font-semibold text-muted block mb-2">Цэнэглэх дүн сонгох</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PRESETS.map((amt) => {
                  const active = selectedAmount === amt && !customAmount;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setCustomAmount('');
                      }}
                      className={`h-11 rounded-xl text-sm font-bold border transition ${
                        active
                          ? 'border-brand bg-brand text-white shadow-sm'
                          : 'border-border bg-surface text-foreground hover:bg-surface-muted'
                      }`}
                    >
                      {amt.toLocaleString('mn-MN')}₮
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Эсвэл өөр дүн оруулах</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="Жишээ: 15000"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-foreground focus:border-brand focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-muted pointer-events-none">
                  ₮
                </span>
              </div>
            </div>

            {error && <Alert tone="danger">{error}</Alert>}

            <Button type="submit" loading={creating} className="w-full h-11 text-sm font-bold">
              QPay нэхэмжлэх үүсгэх ({activeAmount.toLocaleString('mn-MN')}₮)
            </Button>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-between text-xs text-muted border-b border-border/50 pb-2">
              <span>Төлөх дүн: <strong className="text-foreground text-sm font-bold">{invoice.amount.toLocaleString('mn-MN')}₮</strong></span>
              <button
                type="button"
                onClick={handleReset}
                className="font-medium text-brand hover:underline"
              >
                Дүн өөрчлөх
              </button>
            </div>

            {/* QPay QR Image */}
            <div className="mx-auto flex max-w-[220px] flex-col items-center rounded-2xl bg-white p-3 shadow-md ring-1 ring-black/10">
              {invoice.qrImage ? (
                <Image
                  src={`data:image/png;base64,${invoice.qrImage}`}
                  alt="QPay QR"
                  width={200}
                  height={200}
                  className="size-48 rounded-lg object-contain"
                  unoptimized
                />
              ) : (
                <div className="grid size-48 place-items-center text-xs text-slate-400">
                  QR код ачааллаж байна...
                </div>
              )}
              <span className="mt-2 text-[11px] font-semibold text-slate-700">Банкны аппаараа уншуулна уу</span>
            </div>

            {/* Polling Pulse Status */}
            <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand animate-pulse">
              <span className="size-2 rounded-full bg-brand" />
              Төлбөр төлөгдөхийг хүлээж байна...
            </div>

            {/* Deep link bank buttons */}
            {invoice.deeplinks && invoice.deeplinks.length > 0 && (
              <div className="space-y-2 pt-2 text-left">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
                  Банкны аппаар шууд төлөх
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {invoice.deeplinks.map((dl) => (
                    <a
                      key={dl.name}
                      href={dl.link}
                      className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2 text-xs font-semibold text-foreground transition hover:border-brand hover:bg-surface-muted"
                    >
                      {dl.logo && (
                        <Image
                          src={dl.logo}
                          alt={dl.name}
                          width={20}
                          height={20}
                          className="size-5 rounded-md object-contain"
                          unoptimized
                        />
                      )}
                      <span className="truncate">{dl.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
