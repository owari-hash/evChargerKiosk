'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { useSlidingIndicator } from '@/components/ui/use-sliding-indicator';
import { cn } from '@/lib/utils';

function OverviewIcon() {
  return (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
    />
  );
}
function WalletIcon() {
  return (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm14 6h.01"
    />
  );
}
function SessionsIcon() {
  return (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 2" />
    </>
  );
}
function EbarimtIcon() {
  return (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 3h12v18l-3-2-3 2-3-2-3 2zm3 5h6M9 11h6M9 14h4"
    />
  );
}

export function AccountNav() {
  const pathname = usePathname();
  const { d } = useI18n();

  const items: { href: string; label: string; icon: () => ReactNode; tour?: string }[] = [
    { href: '/account', label: d.account.nav.overview, icon: OverviewIcon },
    { href: '/account/wallet', label: d.account.nav.wallet, icon: WalletIcon, tour: 'nav-wallet' },
    { href: '/account/sessions', label: d.account.nav.sessions, icon: SessionsIcon, tour: 'nav-sessions' },
    { href: '/account/ebarimt', label: d.account.nav.ebarimt, icon: EbarimtIcon },
  ];

  const isActive = (href: string) =>
    href === '/account' ? pathname === '/account' : pathname.startsWith(href);
  const activeHref = items.find((item) => isActive(item.href))?.href ?? null;
  const { indicatorRef, itemRef } = useSlidingIndicator<HTMLAnchorElement>(activeHref);

  return (
    <nav
      aria-label={d.account.title}
      data-tour="account-nav"
      className="md:self-start md:sticky md:top-20"
    >
      <ul className="relative grid grid-cols-4 gap-1 rounded-2xl bg-surface-muted/40 p-1 ring-1 ring-border/60 md:flex md:min-w-0 md:flex-col md:gap-0.5 md:rounded-none md:bg-transparent md:p-0 md:ring-0">
        {/* One glass pill — the same as the payment switch, but toned down —
            that slides to the current tab: down the sidebar on a wide screen,
            along the row on a phone. */}
        <span
          ref={indicatorRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-xl bg-surface opacity-0 shadow-sm ring-1 ring-border/70 data-[ready=true]:transition-[transform,width,height,opacity] data-[ready=true]:duration-[400ms] data-[ready=true]:ease-[cubic-bezier(0.34,1.3,0.64,1)] motion-reduce:transition-none"
        />
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                ref={itemRef(item.href)}
                href={item.href}
                data-tour={item.tour}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-14 sm:h-16 flex-col items-center justify-center gap-0.5 sm:gap-1 rounded-xl px-1 sm:px-1.5 text-center text-[10px] sm:text-[11px] font-medium leading-tight transition-colors duration-200',
                  'md:h-11 md:w-full md:flex-row md:justify-start md:gap-2.5 md:px-3.5 md:text-sm',
                  active ? 'font-semibold text-foreground' : 'text-muted hover:text-foreground',
                )}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className={cn('size-3.5 sm:size-4 shrink-0 transition-colors', active ? 'text-brand' : 'text-muted')}
                >
                  <Icon />
                </svg>
                <span className="truncate max-w-full leading-tight md:line-clamp-1 md:whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
