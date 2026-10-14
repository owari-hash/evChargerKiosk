'use client';

import { useEffect, useRef, useState } from 'react';
import { formatMoney } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { pushNotification } from '@/lib/notifications-store';

interface WalletEntry {
  id: string;
  type: 'TOPUP' | 'CHARGE' | 'REFUND' | 'ADJUSTMENT' | 'BONUS';
  amount: number;
  balanceAfter: number;
  description?: string;
}

const POLL_MS = 20_000;
const LAST_SEEN_KEY = 'eplug-wallet-last-seen-entry';

const TYPE_LABEL: Record<WalletEntry['type'], { mn: string; en: string }> = {
  TOPUP: { mn: 'Хэтэвч цэнэглэгдлээ', en: 'Wallet topped up' },
  CHARGE: { mn: 'Цэнэглэлтийн төлбөр хасагдлаа', en: 'Charge deducted' },
  REFUND: { mn: 'Буцаалт орлоо', en: 'Refund received' },
  ADJUSTMENT: { mn: 'Хэтэвч засварлагдлаа', en: 'Wallet adjusted' },
  BONUS: { mn: 'Урамшуулал орлоо', en: 'Bonus credited' },
};

/**
 * Polls the signed-in driver's own wallet and pops a toast the moment a new
 * ledger entry appears — a top-up settling, a charge being deducted, a
 * refund. There is no driver-facing live event stream (only the CSMS console
 * has one), so this trades a little latency for not needing to build one.
 */
export function WalletWatcher({ signedIn }: { signedIn: boolean }) {
  const { locale } = useI18n();
  const [toast, setToast] = useState<{ entry: WalletEntry; key: number } | null>(null);
  const lastSeenId = useRef<string | null>(null);
  const primed = useRef(false);

  useEffect(() => {
    if (!signedIn) return;
    try {
      lastSeenId.current = window.localStorage.getItem(LAST_SEEN_KEY);
    } catch {
      lastSeenId.current = null;
    }

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch('/app-api/wallet?limit=1', { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { entries?: WalletEntry[] };
        const latest = body.entries?.[0];
        if (!latest || cancelled) return;

        if (lastSeenId.current === null) {
          // First poll this session: record the baseline silently, so
          // history from before the widget mounted never pops a toast.
          lastSeenId.current = latest.id;
          primed.current = true;
          try {
            window.localStorage.setItem(LAST_SEEN_KEY, latest.id);
          } catch {
            // Private mode — this just re-announces the same entry next load.
          }
          return;
        }

        if (latest.id !== lastSeenId.current) {
          lastSeenId.current = latest.id;
          try {
            window.localStorage.setItem(LAST_SEEN_KEY, latest.id);
          } catch {
            // Nothing to persist; the toast itself still shows this once.
          }
          setToast({ entry: latest, key: Date.now() });
          const label = TYPE_LABEL[latest.type]?.[locale === 'en' ? 'en' : 'mn'] ?? latest.type;
          const positive = latest.amount >= 0;
          pushNotification({
            kind: 'wallet',
            title: label,
            body: `${positive ? '+' : ''}${formatMoney(latest.amount, locale)}${latest.description ? ` · ${latest.description}` : ''}`,
          });
        }
      } catch {
        // Offline or a transient failure — the next poll tries again.
      }
    }

    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [signedIn, locale]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (!toast) return null;

  const label = TYPE_LABEL[toast.entry.type]?.[locale === 'en' ? 'en' : 'mn'] ?? toast.entry.type;
  const positive = toast.entry.amount >= 0;

  return (
    <div
      key={toast.key}
      role="status"
      className="fixed left-1/2 top-4 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 animate-[toast-in_0.2s_ease-out]"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-xl">
        <span
          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${positive ? 'bg-brand' : 'bg-warning'}`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted">
            {positive ? '+' : ''}
            {formatMoney(toast.entry.amount, locale)}
            {toast.entry.description ? ` · ${toast.entry.description}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setToast(null)}
          aria-label="close"
          className="text-muted hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  );
}
