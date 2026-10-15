import type { NotificationKind } from '@/lib/notifications-store';
import type { ToastKind } from '@/lib/toast-store';
import { cn } from '@/lib/utils';

/**
 * The small round badge that tells notification kinds apart, in the bell
 * list and on toasts: a bolt for a charge starting, a check for one
 * finishing, a wallet for ledger entries, a megaphone dot for news.
 */
export function NotificationIcon({
  kind,
  className,
}: {
  kind: NotificationKind | ToastKind;
  className?: string;
}) {
  const tone =
    kind === 'session-started'
      ? 'bg-brand text-brand-contrast'
      : kind === 'session-finished'
        ? 'bg-brand-soft text-brand ring-1 ring-brand/30'
        : kind === 'wallet-out'
          ? 'bg-warning/15 text-warning'
          : kind === 'announcement'
            ? 'bg-brand-soft text-brand'
            : 'bg-surface-muted text-muted ring-1 ring-border';

  return (
    <span
      aria-hidden
      className={cn('grid size-8 shrink-0 place-items-center rounded-full', tone, className)}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        {kind === 'session-started' ? (
          <path
            d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        ) : kind === 'session-finished' ? (
          <path
            d="m5 12.5 4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : kind === 'announcement' ? (
          <path
            d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Zm13-3a5 5 0 0 1 0 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M4 7a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v2M4 7v10a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-3M4 7a2 2 0 0 0 2 2h13a1 1 0 0 1 1 1v3m0 0h-4a1.5 1.5 0 0 0 0 3h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}
