'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { useI18n } from './i18n-provider';

/**
 * Writes the locale cookie from the client and refreshes so every server component
 * re-renders in the new language. One year, root path, lax — no personal data.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, d } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      role="group"
      aria-label={d.common.language}
      className={cn(
        'inline-flex items-center rounded-xl bg-surface-muted p-0.5 ring-1 ring-border',
        pending && 'opacity-70',
        className,
      )}
    >
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          aria-pressed={code === locale}
          className={cn(
            'rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition',
            code === locale
              ? 'bg-surface text-foreground shadow-sm'
              : 'text-muted hover:text-foreground',
          )}
        >
          {code === 'mn' ? 'МН' : 'EN'}
          <span className="sr-only"> — {LOCALE_LABELS[code]}</span>
        </button>
      ))}
    </div>
  );
}
