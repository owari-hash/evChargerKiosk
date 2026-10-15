/**
 * Browser storage that belongs to one driver.
 *
 * The notification history, the wallet watcher's last-seen marker, the
 * dismissed announcements and the assistant chat all live in localStorage,
 * which is per browser, not per account — so on a shared computer the next
 * driver to sign in used to inherit the previous one's. Each of those keys is
 * now suffixed with the owner's user id (`guest` for a signed-out visitor),
 * and an explicit sign-out also removes the driver's personal content.
 */

export const GUEST_SCOPE = 'guest';

/** `base` scoped to one owner: `eplug-notifications:<userId>`. */
export function scopedKey(base: string, userId: string | null | undefined): string {
  return `${base}:${userId || GUEST_SCOPE}`;
}

/**
 * Keys written before scoping existed, by whichever driver was signed in at
 * the time. Nobody can tell whose they were, so they are dropped.
 */
const LEGACY_KEYS = [
  'eplug-notifications',
  'eplug-wallet-last-seen-entry',
  'eplug-announcements-seen',
  'eplug-assistant-history',
];

/** Personal content removed when this driver signs out on purpose. */
const CLEARED_ON_SIGN_OUT = ['eplug-notifications', 'eplug-assistant-history'];

function remove(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable — there is nothing stored to remove either.
  }
}

/** Drops the unscoped keys an older build of the site left behind. */
export function dropLegacyKeys(): void {
  for (const key of LEGACY_KEYS) remove(key);
}

/**
 * Called by every sign-out button before the page refreshes: removes the
 * driver's notification history and assistant chat from this browser. The
 * in-memory copies are dropped by the components themselves when the layout
 * re-renders with no user (see `UserScope` and the keyed watchers).
 */
export function clearUserStorage(userId: string): void {
  for (const base of CLEARED_ON_SIGN_OUT) remove(scopedKey(base, userId));
  dropLegacyKeys();
}
