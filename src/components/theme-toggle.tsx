'use client';

import { useEffect, useState } from 'react';
import { useI18n } from './i18n-provider';

type Theme = 'light' | 'dark';

/**
 * Flips `data-theme` on <html> and remembers the choice. With no stored choice the
 * page follows the OS preference, which is what the CSS already defaults to.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { d } = useI18n();
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem('evapp-theme') as Theme | null;
    const initial =
      stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem('evapp-theme', next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={d.common.toggleTheme}
      title={d.common.toggleTheme}
      className={className ?? 'grid size-9 place-items-center rounded-xl text-muted transition hover:bg-surface-muted hover:text-foreground'}
    >
      {/* Rendered only once the client knows the theme, to avoid a hydration mismatch. */}
      {theme !== null && (
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
          {theme === 'dark' ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.36 6.36-1.41-1.41M7.05 7.05 5.64 5.64m12.72 0-1.41 1.41M7.05 16.95l-1.41 1.41M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
          )}
        </svg>
      )}
    </button>
  );
}
