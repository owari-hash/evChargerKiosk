'use client';

import { useEffect } from 'react';
import { formatMoney, intlLocale } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { pushNotification } from '@/lib/notifications-store';
import { showToast } from '@/lib/toast-store';
import { scopedKey } from '@/lib/user-scope';

interface WalletEntry {
  id: string;
  type: 'TOPUP' | 'CHARGE' | 'REFUND' | 'ADJUSTMENT' | 'BONUS';
  amount: number;
  balanceAfter: number;
  description?: string;
}

const POLL_MS = 20_000;

/** Fired by the wallet page when a payment settles: "check the ledger now". */
export const WALLET_CHANGED_EVENT = 'eplug:wallet-changed';
const LAST_SEEN_KEY = 'eplug-wallet-last-seen-entry';

const TYPE_LABEL: Record<WalletEntry['type'], { mn: string; en: string }> = {
  TOPUP: { mn: 'Хэтэвч цэнэглэгдлээ', en: 'Wallet topped up' },
  CHARGE: { mn: 'Цэнэглэлтийн төлбөр хасагдлаа', en: 'Charge deducted' },
  REFUND: { mn: 'Буцаалт орлоо', en: 'Refund received' },
  ADJUSTMENT: { mn: 'Хэтэвч засварлагдлаа', en: 'Wallet adjusted' },
  BONUS: { mn: 'Урамшуулал орлоо', en: 'Bonus credited' },
};

/**
 * Files a ledger entry in the bell and pops its toast — once. Keyed on the
 * entry id, so the wallet page announcing a top-up it just settled and this
 * watcher spotting the same entry (in any tab) never show it twice.
 */
export function announceWalletEntry(
  entry: Pick<WalletEntry, 'id' | 'type' | 'amount' | 'description'>,
  locale: string,
): void {
  const label = TYPE_LABEL[entry.type]?.[locale === 'en' ? 'en' : 'mn'] ?? entry.type;
  const positive = entry.amount >= 0;
  const cleanDesc = entry.description?.replace(/\s*\([^)]*үлдэгдэл[^)]*\)/gi, '').trim();
  const text = `${positive ? '+' : ''}${formatMoney(entry.amount, intlLocale(locale))}${
    cleanDesc ? ` · ${cleanDesc}` : ''
  }`;
  const filed = pushNotification({
    kind: 'wallet',
    title: label,
    body: text,
    href: '/account/wallet',
    dedupeKey: `wallet:${entry.id}`,
  });
  if (filed) showToast({ kind: positive ? 'wallet-in' : 'wallet-out', title: label, body: text });
}

/**
 * Polls the signed-in driver's own wallet and pops a toast the moment a new
 * ledger entry appears — a top-up settling, a charge being deducted, a
 * refund. There is no driver-facing live event stream (only the CSMS console
 * has one), so this trades a little latency for not needing to build one.
 *
 * The last-seen marker is stored per driver, so a different driver signing in
 * on the same browser gets their own silent baseline. Mounted (keyed by user
 * id) for signed-in drivers only; the toast itself goes through `ToastHost`.
 */
export function WalletWatcher({ userId }: { userId: string }) {
  const { locale } = useI18n();

  useEffect(() => {
    const storageKey = scopedKey(LAST_SEEN_KEY, userId);
    let lastSeenId: string | null;
    try {
      lastSeenId = window.localStorage.getItem(storageKey);
    } catch {
      lastSeenId = null;
    }

    let cancelled = false;

    function remember(id: string) {
      lastSeenId = id;
      try {
        window.localStorage.setItem(storageKey, id);
      } catch {
        // Private mode — this just re-announces the same entry next load.
      }
    }

    async function poll() {
      try {
        const res = await fetch('/app-api/wallet?limit=1', { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { entries?: WalletEntry[] };
        const latest = body.entries?.[0];
        if (!latest || cancelled) return;

        if (lastSeenId === null) {
          // First poll for this driver on this browser: record the baseline
          // silently, so history from before never pops a toast.
          remember(latest.id);
          return;
        }

        if (latest.id !== lastSeenId) {
          remember(latest.id);
          announceWalletEntry(latest, locale);
        }
      } catch {
        // Offline or a transient failure — the next poll tries again.
      }
    }

    void poll();
    const id = window.setInterval(poll, POLL_MS);
    // A top-up that just settled on this page asks for an immediate look, so
    // its success toast appears at once instead of on the next 20 s poll.
    const now = () => void poll();
    window.addEventListener(WALLET_CHANGED_EVENT, now);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener(WALLET_CHANGED_EVENT, now);
    };
  }, [userId, locale]);

  return null;
}
