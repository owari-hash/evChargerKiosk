'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  clearAll,
  fetchServerNotifications,
  getSnapshot,
  markAllRead,
  subscribe,
  type NotificationItem,
} from '@/lib/notifications-store';
import { formatDateTime } from '@/lib/utils';
import { useI18n } from '@/components/i18n-provider';
import { NotificationIcon } from '@/components/notification-icon';
import { Modal, ModalHeader, Button } from '@/components/ui';

const EMPTY = { items: [], unread: 0 };

/**
 * The bell button in the header: wallet changes, announcements and charging
 * sessions starting or finishing that the driver has already seen once as a
 * toast or a modal, kept here so they can find them again. Entries with a
 * link open it (a session opens the charging history). Same role as the
 * admin console's bell, scaled down to one driver's own history instead of
 * the whole network's.
 */
export function NotificationBell() {
  const { d, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  /** «Цэвэрлэх» asks first; this is the "are you sure?" step. */
  const [confirmClear, setConfirmClear] = useState(false);
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
    const next = !open;
    setOpen(next);
    setConfirmClear(false);
    // Opening no longer marks everything read: unread entries stay
    // highlighted until «Бүгдийг унших».
    if (next) void fetchServerNotifications();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={d.notifications.label}
        className="relative grid size-8 place-items-center rounded-[10px] text-muted transition hover:bg-surface hover:text-foreground cursor-pointer"
      >
        <BellIcon />
        {unread > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">{d.notifications.label}</span>
            {items.length > 0 && confirmClear && (
              <div className="flex items-center gap-1">
                <span className="mr-1 text-xs text-muted">{d.notifications.clearConfirm}</span>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-lg bg-danger px-2 py-1 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  {d.notifications.clearNo}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearAll();
                    setConfirmClear(false);
                  }}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-brand transition hover:bg-brand/10"
                >
                  {d.notifications.clearYes}
                </button>
              </div>
            )}
            {items.length > 0 && !confirmClear && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={unread === 0 && items.every((i) => i.isRead)}
                  aria-label={d.notifications.markAllRead}
                  title={d.notifications.markAllRead}
                  className="grid size-8 place-items-center rounded-lg text-brand transition hover:bg-brand/10 disabled:cursor-default disabled:text-muted/50 disabled:hover:bg-transparent"
                >
                  <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2 12 5 5L18 6M12 16l1 1L22 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  aria-label={d.notifications.clear}
                  title={d.notifications.clear}
                  className="grid size-8 place-items-center rounded-lg text-danger transition hover:bg-danger/10"
                >
                  <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-border/60">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted">{d.notifications.empty}</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedNotif(item);
                    setOpen(false);
                  }}
                  className={`relative flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-surface-muted/60 cursor-pointer group ${
                    item.isRead ? '' : 'bg-brand/[0.06]'
                  }`}
                >
                  {!item.isRead && (
                    <span aria-hidden className="absolute right-3 top-4 size-2 rounded-full bg-brand" />
                  )}
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 shrink-0 rounded-xl object-cover ring-1 ring-border group-hover:scale-105 transition"
                    />
                  ) : (
                    <NotificationIcon kind={item.kind} size="md" className="group-hover:scale-105 transition" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground group-hover:text-brand transition">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted/90 leading-snug">{item.body}</p>
                    <p className="mt-1 text-[11px] text-muted/70">{formatDateTime(item.at, locale)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {/* Bigger Detail Modal */}
      {selectedNotif && (
        <Modal
          onClose={() => setSelectedNotif(null)}
          maxWidth="md"
        >
          <ModalHeader
            title={d.notifications.label}
            onClose={() => setSelectedNotif(null)}
          />
          <div className="space-y-4 p-6 pt-5">
            <div className="flex items-start gap-3.5">
              {selectedNotif.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedNotif.imageUrl}
                  alt=""
                  className="size-14 rounded-2xl object-cover ring-1 ring-border shadow-md shrink-0"
                />
              ) : (
                <NotificationIcon kind={selectedNotif.kind} size="lg" />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-foreground tracking-tight leading-snug">
                  {selectedNotif.title}
                </h3>
                <p className="mt-1 text-xs text-muted/70">
                  {formatDateTime(selectedNotif.at, locale)}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-surface-muted/60 p-4 border border-border/50 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {selectedNotif.body}
            </div>

            {selectedNotif.imageUrl && (
              <div className="overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedNotif.imageUrl}
                  alt={selectedNotif.title}
                  className="max-h-72 w-full object-cover"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              {selectedNotif.href ? (
                <Link
                  href={selectedNotif.href}
                  onClick={() => setSelectedNotif(null)}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-brand px-4 text-xs font-semibold text-brand-contrast transition hover:bg-brand/90"
                >
                  Нээх
                </Link>
              ) : null}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedNotif(null)}
              >
                Хаах
              </Button>
            </div>
          </div>
        </Modal>
      )}
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
