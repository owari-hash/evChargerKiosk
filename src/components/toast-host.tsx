'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { NotificationIcon } from '@/components/notification-icon';
import { useI18n } from '@/components/i18n-provider';
import { anyModalOpen, isGuideActive, subscribeOverlays } from '@/lib/overlay-lock';
import { dismissToast, getServerToasts, getToasts, subscribeToasts, type Toast } from '@/lib/toast-store';

const VISIBLE_MS = 6_000;

/**
 * Renders the watchers' toasts as one stack at the top of the screen.
 *
 * Nothing shows while the spotlight guide or any modal owns the screen (see
 * overlay-lock): the toasts wait, and their timers only start once the
 * overlay is gone, so a driver reading a modal does not miss them either.
 */
export function ToastHost() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);
  const blocked = useSyncExternalStore(
    subscribeOverlays,
    () => isGuideActive() || anyModalOpen(),
    () => false,
  );

  if (blocked || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed left-1/2 top-4 z-50 flex w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const { d } = useI18n();
  const router = useRouter();

  useEffect(() => {
    const id = window.setTimeout(() => dismissToast(toast.id), VISIBLE_MS);
    return () => window.clearTimeout(id);
  }, [toast.id]);

  function open() {
    if (!toast.href) return;
    dismissToast(toast.id);
    router.push(toast.href);
  }

  return (
    <div
      role="status"
      className="toast-card pointer-events-auto flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-xl"
    >
      <NotificationIcon kind={toast.kind} />
      {toast.href ? (
        <button type="button" onClick={open} className="min-w-0 flex-1 text-left">
          <ToastText toast={toast} />
        </button>
      ) : (
        <div className="min-w-0 flex-1">
          <ToastText toast={toast} />
        </div>
      )}
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label={d.common.close}
        className="text-muted hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}

function ToastText({ toast }: { toast: Toast }) {
  return (
    <>
      <p className="text-sm font-semibold text-foreground">{toast.title}</p>
      <p className="text-sm text-muted">{toast.body}</p>
    </>
  );
}
