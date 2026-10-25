'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from './i18n-provider';
import type { Station } from '@/lib/types';

/** How often the counts refresh while the page is open. */
const REFRESH_MS = 60_000;

/**
 * "● 5 · ● 4" in the top bar: how many stations are online and offline right
 * now. Tapping it opens the station list. Renders nothing until the first
 * count arrives, and keeps the last good count if a refresh fails.
 */
export function StationStatusBadge({ className = '' }: { className?: string }) {
  const { d } = useI18n();
  const [counts, setCounts] = useState<{ online: number; offline: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/app-api/stations?limit=200', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { stations?: Station[] };
        const stations = data.stations ?? [];
        const offline = stations.filter((s) => s.availability === 'offline').length;
        if (!cancelled) setCounts({ online: stations.length - offline, offline });
      } catch {
        // Keep whatever was shown last.
      }
    }
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!counts) return null;

  const label = `${d.headerStatus.online}: ${counts.online}, ${d.headerStatus.offline}: ${counts.offline}`;

  return (
    <Link
      href="/stations"
      aria-label={label}
      title={label}
      className={`inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold tabular-nums text-foreground ring-1 ring-border transition hover:bg-surface-muted sm:h-9 sm:rounded-xl sm:px-3 ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        {counts.online}
        <span className="hidden font-medium text-muted lg:inline">{d.headerStatus.online}</span>
      </span>
      <span aria-hidden className="h-3.5 w-px bg-border" />
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full bg-red-500" />
        {counts.offline}
        <span className="hidden font-medium text-muted lg:inline">{d.headerStatus.offline}</span>
      </span>
    </Link>
  );
}
