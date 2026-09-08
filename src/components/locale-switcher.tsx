'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LOCALES, LOCALE_COOKIE, LOCALE_LABELS, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { useI18n } from './i18n-provider';

/**
 * Regional-indicator flag emoji fall back to plain "MN"/"GB" text on a lot of
 * Windows font configurations, so the flags are drawn as tiny inline SVGs instead —
 * identical everywhere, no font/emoji-set dependency.
 */
function MnFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px]" aria-hidden>
      <rect width="10" height="20" fill="#c4272f" />
      <rect x="10" width="10" height="20" fill="#015197" />
      <rect x="20" width="10" height="20" fill="#c4272f" />
      {/* Soyombo, simplified: flame, sun, crescent moon, then the pillar with a
          central disc standing in for the yin-yang. */}
      <g fill="#f9cf02">
        <path d="M5 1.6 6 3.4 5 3 4 3.4Z" />
        <circle cx="5" cy="4.7" r="0.95" />
        <circle cx="5" cy="6.9" r="1" />
        <circle cx="5.55" cy="6.7" r="0.85" fill="#c4272f" />
        <rect x="3.1" y="8.7" width="3.8" height="0.85" />
        <rect x="3.1" y="9.9" width="0.85" height="6.4" />
        <rect x="6.05" y="9.9" width="0.85" height="6.4" />
        <rect x="3.1" y="16.4" width="3.8" height="0.85" />
        <circle cx="5" cy="13.1" r="1.25" />
      </g>
      <path d="M5 11.85a1.25 1.25 0 0 0 0 2.5 0.625 0.625 0 0 1 0-1.25 0.625 0.625 0 0 0 0-1.25Z" fill="#c4272f" />
    </svg>
  );
}

function GbFlag() {
  return (
    <svg viewBox="0 0 30 20" className="h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px]" aria-hidden>
      <rect width="30" height="20" fill="#00247d" />
      <path d="M0 0 30 20M30 0 0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0 30 20M30 0 0 20" stroke="#cf142b" strokeWidth="1.6" />
      <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6.5" />
      <path d="M15 0V20M0 10H30" stroke="#cf142b" strokeWidth="4" />
    </svg>
  );
}

function FlagIcon({ code }: { code: Locale }) {
  return code === 'mn' ? <MnFlag /> : <GbFlag />;
}

/**
 * Writes the locale cookie from the client and refreshes so every server component
 * re-renders in the new language. One year, root path, lax — no personal data.
 */
export function LocaleSwitcher({
  className,
  bare = false,
}: {
  className?: string;
  /** Skip the pill chrome so a parent can host it inside its own container. */
  bare?: boolean;
}) {
  const { locale, d } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const next = LOCALES.find((code) => code !== locale) ?? locale;

  function toggle() {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${d.common.language}: ${LOCALE_LABELS[locale]}`}
      title={LOCALE_LABELS[locale]}
      className={cn(
        'inline-flex items-center gap-1.5 transition-opacity',
        bare
          ? 'rounded-[10px] px-2.5 py-1.5'
          : 'rounded-xl bg-surface-muted px-2.5 py-1.5 ring-1 ring-border',
        pending && 'opacity-70',
        className,
      )}
    >
      <FlagIcon code={locale} />
      <span className="text-xs font-semibold text-muted">{locale.toUpperCase()}</span>
    </button>
  );
}
