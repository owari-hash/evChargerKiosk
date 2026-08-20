import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';
import type { Dictionary } from './dictionaries';
import { getDictionary } from './dictionaries';

export { LOCALES, LOCALE_LABELS, LOCALE_COOKIE, DEFAULT_LOCALE, isLocale } from './config';
export type { Locale } from './config';
export type { Dictionary } from './dictionaries';
export { getDictionary } from './dictionaries';

/** Reads the visitor's language from the cookie. Server components only. */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const value = jar.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getTranslations(): Promise<{ locale: Locale; d: Dictionary }> {
  const locale = await getLocale();
  return { locale, d: getDictionary(locale) };
}

/** Replaces {placeholder} tokens: format(d.footer.rights, { year: 2026 }). */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
