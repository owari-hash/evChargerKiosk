'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { PublicUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useI18n } from './i18n-provider';

/** Avatar button showing the user's initial; opens a small menu with account + sign out. */
export function UserMenu({ user }: { user: PublicUser }) {
  const { d } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const displayName = user.name?.trim() || user.email;
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    await fetch('/app-api/auth/logout', { method: 'POST' });
    setOpen(false);
    setSigningOut(false);
    router.replace('/');
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={displayName}
        title={displayName}
        className={cn(
          'grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-strong',
          'text-sm font-bold text-brand-contrast ring-2 ring-transparent transition',
          'hover:ring-brand/30',
          open && 'ring-brand/40',
        )}
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 rounded-2xl bg-surface p-1.5 shadow-[0_16px_40px_-16px_rgb(2_6_23/0.5)] ring-1 ring-border"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <span aria-hidden className="my-1 block h-px bg-border" />
          <Link
            href="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 text-muted">
              <circle cx="12" cy="8" r="3.5" />
              <path strokeLinecap="round" d="M4.5 20c1.4-3.8 4.7-6 7.5-6s6.1 2.2 7.5 6" />
            </svg>
            {d.common.myAccount}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-60"
          >
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3M16 17l5-5-5-5M21 12H9" />
            </svg>
            {d.common.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
