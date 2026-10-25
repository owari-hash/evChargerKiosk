'use client';

import { useEffect, useRef, useState } from 'react';
import { format, useI18n } from '@/components/i18n-provider';
import { RangeCalendar } from '@/components/ui/range-calendar';
import { cn } from '@/lib/utils';

export interface SessionsFilter {
  /** 7, 14, 30 or 90 days back from today. */
  presetDays?: number;
  /** `YYYY-MM-DD` range picked on the calendar; used when no preset is set. */
  from: string;
  to: string;
}

export const NO_FILTER: SessionsFilter = { from: '', to: '' };

const PRESETS = [7, 14, 30, 90];

/**
 * The sessions filter as a dropdown under its button, in the same shape as
 * the app's sheet: quick ranges as chips, "pick dates" opening a range
 * calendar, then Reset / Apply. Click outside or Escape closes it.
 */
export function SessionsFilterDropdown({
  initial,
  onApply,
  onClose,
}: {
  initial: SessionsFilter;
  onApply: (filter: SessionsFilter) => void;
  onClose: () => void;
}) {
  const { d } = useI18n();
  const t = d.account.sessions;
  const [preset, setPreset] = useState<number | undefined>(initial.presetDays);
  const [custom, setCustom] = useState(!initial.presetDays && Boolean(initial.from));
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      // The button that opened it toggles it itself.
      const target = event.target as Element;
      if (rootRef.current?.contains(target) || target.closest('[data-filter-toggle]')) return;
      onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const shown = (key: string) => (key ? key.replaceAll('-', '.') : '—');

  function apply() {
    if (custom && from) onApply({ from, to: to || from });
    else if (!custom && preset) onApply({ presetDays: preset, from: '', to: '' });
    else onApply(NO_FILTER);
  }

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={t.filterTitle}
      className="absolute right-0 top-[calc(100%+8px)] z-40 flex max-h-[min(80vh,40rem)] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-2xl bg-surface shadow-[0_24px_48px_-20px_rgb(2_6_23/0.6)] ring-1 ring-border"
    >
      <div className="flex-1 overflow-y-auto px-4 pb-3 pt-4">
        <p className="mb-3 text-sm font-semibold text-foreground">{t.filterByDate}</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {PRESETS.map((days) => (
            <Chip
              key={days}
              selected={!custom && preset === days}
              onClick={() => {
                setCustom(false);
                setPreset(preset === days ? undefined : days);
              }}
            >
              {format(t.filterDays, { n: days })}
            </Chip>
          ))}
          <Chip
            selected={custom}
            onClick={() => {
              setCustom(true);
              setPreset(undefined);
            }}
          >
            {t.filterCustom}
          </Chip>
        </div>

        {custom && (
          <div className="mt-4 space-y-3">
            <div className="flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold tabular-nums text-foreground ring-1 ring-border">
              <span>{shown(from)}</span>
              <span className="text-muted">—</span>
              <span>{shown(to || from)}</span>
              <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="ml-auto size-5 text-muted">
                <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
                <path strokeLinecap="round" d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
            </div>
            <RangeCalendar
              from={from}
              to={to}
              onChange={(f, tt) => {
                setFrom(f);
                setTo(tt);
              }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={() => onApply(NO_FILTER)}
          className="h-11 rounded-xl bg-surface-muted text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-surface-muted/70"
        >
          {t.filterReset}
        </button>
        <button
          type="button"
          onClick={apply}
          className="h-11 rounded-xl bg-brand text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90"
        >
          {t.filterApply}
        </button>
      </div>
    </div>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'h-10 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-medium transition',
        selected
          ? 'bg-brand text-white shadow-sm'
          : 'bg-surface-muted text-foreground ring-1 ring-border hover:ring-brand/40',
      )}
    >
      {children}
    </button>
  );
}
