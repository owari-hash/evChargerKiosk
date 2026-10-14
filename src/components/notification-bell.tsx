'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getSnapshot, markAllRead, subscribe } from '@/lib/notifications-store';
import { formatDateTime } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';

const EMPTY = { items: [], unread: 0 };

/**
 * The bell button in the header: wallet changes and announcements the
 * driver has already seen once as a toast or a modal, kept here so they can
 * find them again. Same role as the admin console's bell, scaled down to
 * one driver's own history instead of the whole network's.
 */
export function NotificationBell() {
  const { d, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { items, unread } = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function toggle() {
    setOpen((o) => !o);
    if (!open) markAllRead();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={d.notifications.label}
        className="relative grid size-8 place-items-center rounded-[10px] text-muted transition hover:bg-surface hover:text-foreground"
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-4 py-3 text-center text-sm font-semibold text-foreground">
            {d.notifications.label}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted">{d.notifications.empty}</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small avatar-sized thumbnail; not worth a remotePatterns entry for next/image.
                    <img
                      src={item.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        item.kind === 'announcement' ? 'bg-brand' : 'bg-muted'
                      }`}
                    />
                  )}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.body}</p>
                    <p className="mt-1 text-[11px] text-muted/70">{formatDateTime(item.at, locale)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
