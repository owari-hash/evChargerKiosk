/**
 * Where the download page sends people.
 *
 * These are the real store listings, kept here rather than fetched from the CSMS
 * `app-releases` settings on purpose: the kiosk page has to render even when the
 * API is unreachable, and a store link changes about once in an app's lifetime.
 * Each is overridable by environment so a staging build can point elsewhere.
 */
const webUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://eplug.mn').replace(/\/+$/, '');

export const appLinks = {
  ios:
    process.env.NEXT_PUBLIC_IOS_APP_URL ||
    'https://apps.apple.com/mn/app/eplug-%D1%86%D1%8D%D0%BD%D1%8D%D0%B3%D0%BB%D1%8D%D0%B3%D1%87/id6802943889',
  android:
    process.env.NEXT_PUBLIC_ANDROID_APP_URL ||
    'https://play.google.com/store/apps/details?id=mn.zevcharger.app&hl=en',
  /**
   * The site's own home page. Absolute rather than "/" because a QR code is
   * scanned by a phone that has no idea what origin the kiosk is showing.
   */
  web: webUrl,
  /**
   * Universal smart link for QR code scanning.
   * Phone scanners hit this link and are dynamically redirected to App Store (iOS)
   * or Google Play (Android) based on their operating system.
   */
  universal: `${webUrl}/app`,
} as const;

export type AppPlatformKey = keyof typeof appLinks;
