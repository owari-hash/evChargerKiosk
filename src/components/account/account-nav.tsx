'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';

export function AccountNav() {
  const pathname = usePathname();
  const { d } = useI18n();

  const items = [
    { href: '/account', label: d.account.nav.overview },
    { href: '/account/wallet', label: d.account.nav.wallet },
    { href: '/account/security', label: d.account.nav.security },
    { href: '/account/sessions', label: d.account.nav.sessions },
  ];

  const isActive = (href: string) =>
    href === '/account' ? pathname === '/account' : pathname.startsWith(href);

  return (
    <nav
      aria-label="Account sections"
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:self-start md:overflow-visible md:px-0 md:sticky md:top-20"
    >
      <ul className="flex min-w-max gap-1 md:min-w-0 md:flex-col">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-11 items-center rounded-xl px-3.5 text-sm font-medium transition md:w-full',
                  active
                    ? 'bg-brand-soft text-brand-strong ring-1 ring-brand/30'
                    : 'text-muted hover:bg-surface-muted hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
