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
    kind === 'success' || kind === 'wallet-in'
      ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]'
      : kind === 'error'
        ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-[0_2px_10px_rgba(244,63,94,0.35)]'
        : kind === 'info'
          ? 'bg-gradient-to-br from-sky-500/20 to-cyan-500/20 text-sky-400 ring-1 ring-sky-500/30'
          : kind === 'session-started'
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
        {kind === 'success' ? (
          <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        ) : kind === 'error' ? (
          <path d="M12 7v6M12 17h.01" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        ) : kind === 'info' ? (
          <path d="M12 11v6M12 7h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        ) : kind === 'session-started' ? (
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
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            <path d="m3 11 15-5v12L3 13v-2Z" />
            <path d="M21 9a4 4 0 0 1 0 6" />
          </g>
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
