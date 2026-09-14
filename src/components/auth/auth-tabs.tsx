'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type Tab = 'login' | 'register';

/**
 * The sign-in / sign-up switch. It lives in the auth layout, so it stays on
 * screen while the form beneath it changes, and its thumb slides the moment
 * it is tapped rather than waiting for the next page to arrive.
 */
export function AuthTabs({ signIn, createAccount }: { signIn: string; createAccount: string }) {
  const pathname = usePathname();
  // Where the driver just tapped, tied to the page they tapped it on: once the
  // path changes the real route takes over, with no effect needed to reset it.
  const [pending, setPending] = useState<{ target: Tab; from: string } | null>(null);

  const current: Tab | null = pathname.startsWith('/register')
    ? 'register'
    : pathname.startsWith('/login')
      ? 'login'
      : null;
  if (!current) return null;

  const active = pending && pending.from === pathname ? pending.target : current;

  const tab = (target: Tab, href: string, label: string) => (
    <Link
      href={href}
      aria-current={current === target ? 'page' : undefined}
      onClick={() => setPending({ target, from: pathname })}
      className={cn(
        'relative z-10 rounded-full py-2.5 text-center text-sm font-semibold transition-colors duration-300',
        active === target ? 'text-foreground' : 'text-muted hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );

  return (
    <nav className="relative mb-7 grid grid-cols-2 rounded-full bg-foreground/[0.06] p-1">
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-surface shadow-sm ring-1 ring-border',
          'transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
          active === 'register' && 'translate-x-full',
        )}
      />
      {tab('login', '/login', signIn)}
      {tab('register', '/register', createAccount)}
    </nav>
  );
}
