'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { en, mn, type Dictionary } from '@/lib/i18n/dictionaries';

/**
 * Client components cannot read cookies during render, so the root layout resolves
 * the locale on the server and seeds this context with it.
 */
interface I18nValue {
  locale: Locale;
  d: Dictionary;
}

const DICTIONARIES: Record<Locale, Dictionary> = { mn, en };

const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  d: DICTIONARIES[DEFAULT_LOCALE],
});

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, d: DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

/** Replaces {placeholder} tokens in a translated string. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
