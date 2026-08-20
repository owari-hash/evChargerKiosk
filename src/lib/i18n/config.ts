export const LOCALES = ['mn', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Mongolian is the primary language of the network; English is the fallback. */
export const DEFAULT_LOCALE: Locale = 'mn';

/**
 * Readable from JavaScript on purpose — the switcher sets it client-side and the
 * server reads it back on the next request. It carries no security meaning.
 */
export const LOCALE_COOKIE = 'evapp_locale';

export const LOCALE_LABELS: Record<Locale, string> = {
  mn: 'Монгол',
  en: 'English',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
