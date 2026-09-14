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
function SecurityIcon() {
  return (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"
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

  const items: { href: string; label: string; icon: () => ReactNode }[] = [
    { href: '/account', label: d.account.nav.overview, icon: OverviewIcon },
    { href: '/account/wallet', label: d.account.nav.wallet, icon: WalletIcon },
    { href: '/account/security', label: d.account.nav.security, icon: SecurityIcon },
    { href: '/account/sessions', label: d.account.nav.sessions, icon: SessionsIcon },
    { href: '/account/ebarimt', label: d.account.nav.ebarimt, icon: EbarimtIcon },
  ];

  const isActive = (href: string) =>
    href === '/account' ? pathname === '/account' : pathname.startsWith(href);
  const activeHref = items.find((item) => isActive(item.href))?.href ?? null;
  const { indicatorRef, itemRef } = useSlidingIndicator<HTMLAnchorElement>(activeHref);

  return (
    <nav
      aria-label={d.account.title}
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:self-start md:overflow-visible md:px-0 md:sticky md:top-20"
    >
      <ul className="relative flex min-w-max gap-1 md:min-w-0 md:flex-col md:gap-0.5">
        {/* One highlight, with its accent bar, that slides to the current tab:
            down the sidebar on a wide screen, along the strip on a phone. */}
        <span
          ref={indicatorRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-xl bg-brand-soft opacity-0 data-[ready=true]:transition-[transform,width,height,opacity] data-[ready=true]:duration-300 data-[ready=true]:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
        >
          <span className="absolute inset-y-1.5 left-0 hidden w-1 rounded-full bg-brand md:block" />
        </span>
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                ref={itemRef(item.href)}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-11 items-center gap-2.5 rounded-xl px-3.5 text-sm font-medium transition-colors duration-200 md:w-full',
                  active ? 'text-brand-strong' : 'text-muted hover:bg-surface-muted/60 hover:text-foreground',
                )}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className={cn('size-4 shrink-0', active ? 'text-brand-strong' : 'text-muted')}
                >
                  <Icon />
                </svg>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
