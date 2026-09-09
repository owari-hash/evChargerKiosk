'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { PublicUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useI18n } from './i18n-provider';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';
import { buttonClass } from './ui/button';

export function SiteHeader({ user }: { user: PublicUser | null }) {
  const { d } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const nav = [
    { href: '/', label: d.nav.home },
    { href: '/pricing', label: d.nav.pricing },
    { href: '/help', label: d.nav.help },
  ];

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  async function signOut() {
    setSigningOut(true);
    await fetch('/app-api/auth/logout', { method: 'POST' });
    setOpen(false);
    setSigningOut(false);
    router.replace('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 shadow-[0_1px_0_0_rgb(15_23_42/0.03),0_8px_24px_-16px_rgb(15_23_42/0.15)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 font-bold text-foreground">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-strong text-brand-contrast shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
              <path d="M13 2 4.5 13.2a.6.6 0 0 0 .48.96H10l-1 8.84 8.5-11.2a.6.6 0 0 0-.48-.96H12z" />
            </svg>
          </span>
          <span className="text-[15px] tracking-tight">Eplug</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive(item.href)
                  ? 'bg-surface-muted text-foreground'
                  : 'text-muted hover:bg-surface-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-0.5 rounded-xl bg-surface-muted p-0.5 ring-1 ring-border sm:flex">
            <LocaleSwitcher bare />
            <span aria-hidden className="h-5 w-px bg-border" />
            <ThemeToggle className="grid size-8 place-items-center rounded-[10px] text-muted transition hover:bg-surface hover:text-foreground" />
          </div>
          <ThemeToggle className="grid size-9 place-items-center rounded-xl text-muted ring-1 ring-border transition hover:bg-surface-muted hover:text-foreground sm:hidden" />

          <div className="hidden items-center md:flex">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className={buttonClass('ghost', 'sm')}>
                  {d.common.signIn}
                </Link>
                <Link href="/register" className={buttonClass('primary', 'sm')}>
                  {d.common.createAccount}
                </Link>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={d.common.toggleNav}
            className="grid size-9 place-items-center rounded-xl text-muted ring-1 ring-border transition hover:bg-surface-muted md:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              {open ? (
                <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-surface md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-lg px-3 py-3 text-sm font-medium',
                  isActive(item.href)
                    ? 'bg-surface-muted text-foreground'
                    : 'text-muted hover:bg-surface-muted',
                )}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {user ? (
                <>
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className={buttonClass('secondary', 'md')}
                  >
                    {d.common.myAccount}
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={signingOut}
                    className={buttonClass('ghost', 'md')}
                  >
                    {d.common.signOut}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={buttonClass('secondary', 'md')}
                  >
                    {d.common.signIn}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className={buttonClass('primary', 'md')}
                  >
                    {d.common.createAccount}
                  </Link>
                </>
              )}
              <LocaleSwitcher className="self-start sm:hidden" />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
