'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  label: string;
  /** `YYYY-MM-DD`, or '' for no date. */
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** Which edge of the field the calendar lines up with. */
  align?: 'left' | 'right';
  className?: string;
  /** Pass both to open/close the calendar from outside, e.g. to chain two pickers. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MN_WEEKDAYS = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];
const EN_WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function todayKey() {
  const now = new Date();
  return toKey(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * A calendar popover in place of `<input type="date">`, whose picker the
 * browser draws itself and cannot be styled to match the app.
 */
export function DatePicker({
  label,
  value,
  onChange,
  min,
  max,
  align = 'left',
  className,
  open: openProp,
  onOpenChange,
}: DatePickerProps) {
  const { locale } = useI18n();
  const mn = locale !== 'en';
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const rootRef = useRef<HTMLDivElement>(null);

  /** The month being browsed; null until the driver flips months. */
  const [browsed, setBrowsed] = useState<{ y: number; m: number } | null>(null);
  // Opens on the chosen month, else the earliest allowed one, else this month.
  const base = new Date(`${value || min || todayKey()}T00:00:00`);
  const view = browsed ?? { y: base.getFullYear(), m: base.getMonth() };

  function setOpen(next: boolean) {
    if (!next) setBrowsed(null);
    setOpenState(next);
    onOpenChange?.(next);
  }

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
    // setOpen is recreated each render; the listeners only need the latest on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle() {
    setOpen(!open);
  }

  function shift(delta: number) {
    const next = new Date(view.y, view.m + delta, 1);
    setBrowsed({ y: next.getFullYear(), m: next.getMonth() });
  }

  function pick(key: string) {
    onChange(key);
    setOpen(false);
  }

  const outOfRange = (key: string) => Boolean((min && key < min) || (max && key > max));

  // Monday-first grid: leading days from last month, trailing from next.
  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(view.y, view.m, i - lead + 1);
    return {
      key: toKey(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      inMonth: date.getMonth() === view.m,
    };
  });
  // Drop a trailing week made only of next month's days.
  const grid = cells.slice(35).every((c) => !c.inMonth) ? cells.slice(0, 35) : cells;

  const today = todayKey();
  const title = mn ? `${view.y} оны ${view.m + 1}-р сар` : `${EN_MONTHS[view.m]} ${view.y}`;
  const weekdays = mn ? MN_WEEKDAYS : EN_WEEKDAYS;
  const shown = value ? value.replaceAll('-', '.') : '';

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={shown ? `${label}: ${shown}` : label}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-xl bg-surface-muted/50 px-3 text-left text-sm ring-1 transition',
          open ? 'ring-2 ring-brand' : 'ring-border hover:ring-brand/40',
        )}
      >
        <span className={cn('truncate tabular-nums', shown ? 'text-foreground' : 'text-muted')}>
          {shown || (mn ? 'Огноо сонгох' : 'Pick a date')}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className={cn('size-4 shrink-0', open || shown ? 'text-brand' : 'text-muted')}
        >
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path strokeLinecap="round" d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            'absolute top-[calc(100%+8px)] z-40 w-[18.5rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-surface p-3 shadow-[0_24px_48px_-20px_rgb(2_6_23/0.6)] ring-1 ring-border',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div className="flex items-center justify-between gap-2 px-1 pb-2">
            <button
              type="button"
              onClick={() => shift(-1)}
              aria-label={mn ? 'Өмнөх сар' : 'Previous month'}
              className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m15 6-6 6 6 6" />
              </svg>
            </button>
            <p className="text-sm font-semibold text-foreground" aria-live="polite">
              {title}
            </p>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label={mn ? 'Дараагийн сар' : 'Next month'}
              className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {weekdays.map((w, i) => (
              <span
                key={w}
                className={cn('py-1.5 text-[11px] font-medium', i >= 5 ? 'text-brand/80' : 'text-muted')}
              >
                {w}
              </span>
            ))}
            {grid.map((cell) => {
              const selected = cell.key === value;
              const isToday = cell.key === today;
              const disabled = outOfRange(cell.key);
              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(cell.key)}
                  aria-pressed={selected}
                  aria-label={cell.key.replaceAll('-', '.')}
                  className={cn(
                    'relative grid aspect-square place-items-center rounded-xl text-sm tabular-nums transition',
                    selected
                      ? 'bg-brand font-semibold text-brand-contrast shadow-sm'
                      : disabled
                        ? 'cursor-not-allowed text-muted/30'
                        : cell.inMonth
                          ? 'text-foreground hover:bg-brand/10 hover:text-brand-strong'
                          : 'text-muted/50 hover:bg-surface-muted',
                    isToday && !selected && 'font-semibold text-brand ring-1 ring-inset ring-brand/40',
                  )}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-border/60 px-1 pt-2">
            <button
              type="button"
              onClick={() => pick('')}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-muted hover:text-foreground"
            >
              {mn ? 'Цэвэрлэх' : 'Clear'}
            </button>
            <button
              type="button"
              disabled={outOfRange(today)}
              onClick={() => pick(today)}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/10 disabled:opacity-40"
            >
              {mn ? 'Өнөөдөр' : 'Today'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
