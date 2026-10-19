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
  size = 'md',
}: {
  kind: NotificationKind | ToastKind;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const tone =
    kind === 'session-started'
      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]'
      : kind === 'session-finished'
        ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 ring-1 ring-cyan-500/30'
        : kind === 'wallet-out'
          ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 ring-1 ring-amber-500/30'
          : kind === 'announcement'
            ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 ring-1 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            : 'bg-surface-muted text-muted ring-1 ring-border';

  const sizeClass =
    size === 'sm'
      ? 'size-7'
      : size === 'lg'
        ? 'size-12'
        : size === 'xl'
          ? 'size-16'
          : 'size-9';

  const svgSize = size === 'sm' ? 14 : size === 'lg' ? 24 : size === 'xl' ? 32 : 18;

  return (
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center rounded-xl transition', sizeClass, tone, className)}
    >
      <svg width={svgSize} height={svgSize} viewBox="0 0 24 24" fill="none">
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
            d="M11 5L6 9H3C2.44772 9 2 9.44772 2 10V14C2 14.5523 2.44772 15 3 15H6L11 19V5ZM15.54 8.46C16.4774 9.39764 17.0041 10.6692 17.0041 11.995C17.0041 13.3208 16.4774 14.5924 15.54 15.53M19.07 4.93C20.9448 6.80527 21.9979 9.34836 21.9979 12C21.9979 14.6516 20.9448 17.1947 19.07 19.07"
            stroke="currentColor"
            strokeWidth="1.8"
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
