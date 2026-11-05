'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { showToast } from '@/lib/toast-store';
import type { StationConnector } from '@/lib/types';
import { cn } from '@/lib/utils';

const COPY = {
  mn: {
    soonest: (m: number) => `Хамгийн ойрын сул хошуу ~${m} мин-д гарна`,
    ask: 'Сул болмогц надад мэдэгдэх',
    on: 'Сул болмогц мэдэгдэнэ',
    cancel: 'Болих',
    onToast: 'Хошуу сул болмогц мэдэгдэл ирнэ (2 цагийн турш).',
    signIn: 'Нэвтэрч, сул болмогц мэдэгдэл аваарай',
    failed: 'Түр алдаа гарлаа. Дахин оролдоно уу.',
  },
  en: {
    soonest: (m: number) => `Next plug should be free in about ${m} min`,
    ask: 'Notify me when a plug is free',
    on: 'We’ll notify you when one frees up',
    cancel: 'Cancel',
    onToast: 'We’ll notify you as soon as a plug is free (for the next 2 hours).',
    signIn: 'Sign in to get notified when a plug is free',
    failed: 'Something went wrong. Please try again.',
  },
};

/** Soonest "minutes to full" across the plugs that are charging right now. */
export function soonestFreeMinutes(connectors: StationConnector[]): number | null {
  const mins = connectors
    .map((c) => c.minutesToFull)
    .filter((m): m is number => typeof m === 'number' && m > 0);
  return mins.length ? Math.ceil(Math.min(...mins)) : null;
}

export function NotifyWhenFree({
  stationId,
  connectors,
  signedIn,
  className,
}: {
  stationId: string;
  connectors: StationConnector[];
  signedIn: boolean;
  className?: string;
}) {
  const { locale } = useI18n();
  const t = COPY[locale === 'en' ? 'en' : 'mn'];
  const [watching, setWatching] = useState(false);
  const [busy, setBusy] = useState(false);
  const url = `/app-api/stations/${encodeURIComponent(stationId)}/watch`;
  const soonest = soonestFreeMinutes(connectors);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    fetch(url, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { watching?: boolean } | null) => alive && setWatching(Boolean(j?.watching)))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [url, signedIn]);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(url, { method: watching ? 'DELETE' : 'POST' });
      if (!res.ok) throw new Error();
      const next = !watching;
      setWatching(next);
      if (next) showToast({ kind: 'success', title: t.on, body: t.onToast });
    } catch {
      showToast({ kind: 'error', title: t.failed, body: '' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn('rounded-2xl bg-surface-muted p-4 ring-1 ring-border', className)}>
      {soonest !== null && (
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-warning" />
          </span>
          {t.soonest(soonest)}
        </p>
      )}
      {signedIn ? (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className={cn(
            'mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60',
            watching
              ? 'bg-surface text-foreground ring-1 ring-brand'
              : 'bg-brand text-brand-contrast hover:brightness-110',
            soonest === null && 'mt-0',
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {watching ? `${t.on} · ${t.cancel}` : t.ask}
        </button>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(`/stations/${stationId}`)}`}
          className={cn('mt-3 block text-center text-sm font-semibold text-brand', soonest === null && 'mt-0')}
        >
          {t.signIn}
        </Link>
      )}
    </div>
  );
}
