'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';

const MN_WEEKDAYS = ['ДА', 'МЯ', 'ЛХ', 'ПҮ', 'БА', 'БЯ', 'НЯ'];
const EN_WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const MN_MONTHS = [
  'Нэгдүгээр', 'Хоёрдугаар', 'Гуравдугаар', 'Дөрөвдүгээр', 'Тавдугаар', 'Зургаадугаар',
  'Долоодугаар', 'Наймдугаар', 'Есдүгээр', 'Аравдугаар', 'Арван нэгдүгээр', 'Арван хоёрдугаар',
];
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const pad = (n: number) => String(n).padStart(2, '0');
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

interface RangeCalendarProps {
  /** `YYYY-MM-DD`, or '' when not picked yet. */
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

/**
 * A month grid for picking a date range: first tap sets the start, second
 * the end (swapped if earlier), a third starts over. Future days are off.
 */
export function RangeCalendar({ from, to, onChange }: RangeCalendarProps) {
  const { locale } = useI18n();
  const mn = locale !== 'en';
  const base = new Date(`${to || from || dateKey(new Date())}T00:00:00`);
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  const today = dateKey(new Date());
  const now = new Date();
  const canNext = view.y < now.getFullYear() || (view.y === now.getFullYear() && view.m < now.getMonth());

  function shift(delta: number) {
    const next = new Date(view.y, view.m + delta, 1);
    setView({ y: next.getFullYear(), m: next.getMonth() });
  }

  function tap(key: string) {
    if (!from || to) onChange(key, '');
    else if (key < from) onChange(key, from);
    else onChange(from, key);
  }

  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const total = Math.ceil((lead + days) / 7) * 7;
  const cells = Array.from({ length: total }, (_, i) => {
    const d = new Date(view.y, view.m, i - lead + 1);
    return { key: dateKey(d), day: d.getDate(), inMonth: d.getMonth() === view.m, col: i % 7 };
  });

  return (
    <div className="rounded-2xl p-3 ring-1 ring-border">
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label={mn ? 'Өмнөх сар' : 'Previous month'}
          className="grid size-9 place-items-center rounded-lg text-foreground transition hover:bg-surface-muted"
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" />
          </svg>
        </button>
        <p className="text-sm font-semibold text-foreground" aria-live="polite">
          {mn ? `${MN_MONTHS[view.m]} сар ${view.y}` : `${EN_MONTHS[view.m]} ${view.y}`}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label={mn ? 'Дараагийн сар' : 'Next month'}
          className="grid size-9 place-items-center rounded-lg text-foreground transition hover:bg-surface-muted disabled:opacity-30"
        >
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {(mn ? MN_WEEKDAYS : EN_WEEKDAYS).map((w, i) => (
          <span key={w} className={cn('py-1.5 text-[11px] font-semibold', i >= 5 ? 'text-brand/80' : 'text-muted')}>
            {w}
          </span>
        ))}
        {cells.map((c) => {
          const isStart = c.key === from;
          const isEnd = c.key === to;
          const endpoint = c.inMonth && (isStart || isEnd);
          const between = c.inMonth && from && to && c.key > from && c.key < to;
          const ranged = Boolean(from && to && from !== to);
          const future = c.key > today;
          return (
            <div
              key={c.key}
              className={cn(
                'relative my-0.5 flex h-10 items-center justify-center',
                between && 'bg-brand/12',
                between && c.col === 0 && 'rounded-l-full',
                between && c.col === 6 && 'rounded-r-full',
              )}
            >
              {/* Half-band behind an endpoint so the range reads as one strip. */}
              {endpoint && ranged && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute inset-y-0 w-1/2 bg-brand/12',
                    isStart ? 'right-0' : 'left-0',
                  )}
                />
              )}
              <button
                type="button"
                disabled={!c.inMonth || future}
                onClick={() => tap(c.key)}
                aria-pressed={endpoint}
                aria-label={c.key.replaceAll('-', '.')}
                className={cn(
                  'relative grid size-9 place-items-center rounded-full text-sm tabular-nums transition',
                  endpoint
                    ? 'bg-brand font-bold text-brand-contrast shadow-sm'
                    : !c.inMonth || future
                      ? 'text-muted/35'
                      : 'text-foreground hover:bg-brand/15',
                  c.key === today && !endpoint && c.inMonth && 'ring-1 ring-inset ring-brand/50',
                )}
              >
                {c.day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
