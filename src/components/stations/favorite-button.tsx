'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { toggleFavorite, useFavorites } from '@/lib/favorites-store';
import { cn } from '@/lib/utils';

/**
 * Heart toggle for a station. Signed out, it sends the driver to sign in and
 * back. Safe inside a card link: it stops the click from navigating.
 */
export function FavoriteButton({
  stationId,
  stationName,
  className,
  size = 'md',
}: {
  stationId: string;
  stationName: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const { locale } = useI18n();
  const { owner, ids } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();
  const on = ids.has(stationId);
  const en = locale === 'en';
  const label = on
    ? en ? `Remove ${stationName} from favourites` : `${stationName}-г дуртайгаас хасах`
    : en ? `Add ${stationName} to favourites` : `${stationName}-г дуртайд нэмэх`;

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!owner) {
      router.push(`/login?next=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    void toggleFavorite(stationId, locale);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        'grid shrink-0 place-items-center rounded-xl ring-1 transition active:scale-90',
        size === 'sm' ? 'size-9' : 'size-10',
        on
          ? 'bg-rose-500/10 text-rose-600 ring-rose-500/30 hover:bg-rose-500/15 dark:text-rose-400'
          : 'bg-surface-muted/70 text-muted ring-border hover:text-rose-600 dark:hover:text-rose-400',
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill={on ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        className={cn('size-4.5 transition-transform', on && 'scale-110')}
      >
        <path strokeLinejoin="round" d="M12 20s-7.5-4.6-9.2-9.3C1.6 7.4 3.8 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.4 0 5.6 3.4 4.4 6.7C19.5 15.4 12 20 12 20Z" />
      </svg>
    </button>
  );
}
