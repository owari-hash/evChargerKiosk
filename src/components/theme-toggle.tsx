'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

/**
 * Flips `data-theme` on <html> and remembers the choice. With no stored choice the
 * page follows the OS preference, which is what the CSS already defaults to.
 */
export function ThemeToggle() {
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
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="grid size-9 place-items-center rounded-xl text-muted ring-1 ring-border transition hover:bg-surface-muted hover:text-foreground"
    >
      {/* Rendered only once the client knows the theme, to avoid a hydration mismatch. */}
      <span aria-hidden className="text-base leading-none">
        {theme === null ? '' : theme === 'dark' ? '☀' : '☾'}
      </span>
    </button>
  );
}
