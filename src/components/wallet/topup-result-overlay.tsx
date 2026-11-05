'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useI18n } from '@/components/i18n-provider';
import {
  dismissTopUpResult,
  getTopUpResult,
  subscribeTopUpResult,
} from '@/lib/topup-result-store';
import { formatMoney, intlLocale } from '@/lib/utils';

const SUCCESS_MS = 3200;

const COPY = {
  mn: {
    success: 'Хэтэвч цэнэглэгдлээ',
    balance: 'Үлдэгдэл',
    fail: 'Төлбөр амжилтгүй',
    failBody: 'Таны данснаас мөнгө хасагдаагүй. Дахин оролдоно уу.',
    retry: 'Дахин оролдох',
    done: 'Болсон',
  },
  en: {
    success: 'Wallet topped up',
    balance: 'Balance',
    fail: 'Payment failed',
    failBody: 'No money was taken. Please try again.',
    retry: 'Try again',
    done: 'Done',
  },
};

/** Counts from 0 up to `to` over ~0.9s, eased. */
function useCountUp(to: number, run: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, run]);
  return value;
}

const BURST = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  return {
    x: Math.cos(angle) * 74,
    y: Math.sin(angle) * 74,
    color: ['#10b981', '#34d399', '#22d3ee', '#fbbf24'][i % 4],
    delay: 180 + (i % 3) * 40,
  };
});

export function TopUpResultOverlay() {
  const result = useSyncExternalStore(subscribeTopUpResult, getTopUpResult, () => null);
  const { locale } = useI18n();
  const t = COPY[locale === 'en' ? 'en' : 'mn'];
  const intl = intlLocale(locale);
  const success = result?.kind === 'success';
  const counted = useCountUp(success ? result.amount : 0, success);

  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissTopUpResult();
    window.addEventListener('keydown', onKey);
    const timer = result.kind === 'success' ? setTimeout(dismissTopUpResult, SUCCESS_MS) : undefined;
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(timer);
    };
  }, [result]);

  if (!result) return null;

  return (
    <div
      key={result.id}
      role="alertdialog"
      aria-live="assertive"
      aria-label={success ? t.success : t.fail}
      className="topup-backdrop fixed inset-0 z-[100] grid place-items-center bg-black/55 p-6"
      onClick={dismissTopUpResult}
    >
      <div
        className="topup-card w-full max-w-xs rounded-3xl bg-surface p-7 text-center shadow-2xl ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mx-auto size-24">
          {success &&
            BURST.map((b, i) => (
              <span
                key={i}
                aria-hidden
                className="topup-spark absolute left-1/2 top-1/2 size-2 rounded-full"
                style={
                  {
                    background: b.color,
                    '--tx': `${b.x}px`,
                    '--ty': `${b.y}px`,
                    animationDelay: `${b.delay}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          <span
            aria-hidden
            className={
              success
                ? 'topup-ring absolute inset-0 rounded-full bg-emerald-500/25'
                : 'topup-ring absolute inset-0 rounded-full bg-rose-500/25'
            }
          />
          <span
            className={
              success
                ? 'topup-badge relative grid size-24 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-[0_12px_30px_-8px_rgb(16_185_129/0.7)]'
                : 'topup-badge topup-shake relative grid size-24 place-items-center rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-[0_12px_30px_-8px_rgb(244_63_94/0.7)]'
            }
          >
            <svg viewBox="0 0 24 24" className="size-12" fill="none" aria-hidden>
              {success ? (
                <path
                  className="topup-draw"
                  d="m5 12.5 4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                />
              ) : (
                <path
                  className="topup-draw"
                  d="M7 7l10 10M17 7 7 17"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  pathLength={1}
                />
              )}
            </svg>
          </span>
        </div>

        <h2 className="topup-text mt-6 text-lg font-bold text-foreground">
          {success ? t.success : t.fail}
        </h2>

        {success ? (
          <>
            <p className="topup-text mt-1 text-3xl font-extrabold tabular-nums text-emerald-500">
              +{formatMoney(counted, intl)}
            </p>
            {typeof result.balance === 'number' && (
              <p className="topup-text mt-2 text-sm text-muted">
                {t.balance}: <span className="font-semibold text-foreground">{formatMoney(result.balance, intl)}</span>
              </p>
            )}
            <span aria-hidden className="mt-5 block h-1 overflow-hidden rounded-full bg-border/60">
              <span
                className="topup-timer block h-full rounded-full bg-emerald-500"
                style={{ animationDuration: `${SUCCESS_MS}ms` }}
              />
            </span>
          </>
        ) : (
          <>
            <p className="topup-text mt-2 text-sm leading-relaxed text-muted">{result.reason || t.failBody}</p>
            <button
              type="button"
              onClick={dismissTopUpResult}
              className="topup-text mt-5 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition active:scale-[0.98]"
            >
              {t.retry}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
