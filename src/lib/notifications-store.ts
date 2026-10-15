/**
 * The driver's own notification history — wallet changes, announcements and
 * charging sessions starting or finishing — shared between the header's bell
 * button and whatever is polling for new ones. A plain module-level store
 * rather than React Context: the pollers and the bell are siblings under the
 * root layout, and a store avoids having to wrap the whole app in a provider
 * for what is, in the end, one small list.
 *
 * The list belongs to one driver. It is stored under that driver's user id
 * (see `setNotificationsOwner`), so the next person to sign in on the same
 * browser never sees it, and signing out empties it in memory at once.
 */

import { scopedKey } from '@/lib/user-scope';

export type NotificationKind = 'wallet' | 'announcement' | 'session-started' | 'session-finished';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  imageUrl?: string | null;
  /** Where clicking the entry in the bell goes; absent entries are not links. */
  href?: string;
  /**
   * Identifies the event itself (e.g. `session:1234:finished`), so the same
   * event noticed by two polls, or by two open tabs, is filed only once.
   */
  dedupeKey?: string;
  at: string;
}

export const NOTIFICATIONS_KEY = 'eplug-notifications';
const MAX_ITEMS = 50;

interface Snapshot {
  items: NotificationItem[];
  unread: number;
}

/** User id whose list is loaded; null while signed out (nothing is kept). */
let owner: string | null = null;
let items: NotificationItem[] = [];
let unread = 0;
let hydrated = false;
// useSyncExternalStore requires getSnapshot() to return the same reference
// until something actually changes — a fresh object on every call looks like
// a change on every render and loops forever. This is that cached reference.
let snapshot: Snapshot = { items, unread };
const listeners = new Set<() => void>();
let storageListening = false;

function storageKey(): string | null {
  return owner ? scopedKey(NOTIFICATIONS_KEY, owner) : null;
}

/** The stored list; null when storage cannot be read at all (private mode). */
function readStored(): NotificationItem[] | null {
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NotificationItem[]) : [];
  } catch {
    return null;
  }
}

function hydrate(): void {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  // Unreadable storage or corrupt data — starts from an empty list.
  items = readStored() ?? [];
  snapshot = { items, unread };
  listenToOtherTabs();
}

function persist(): void {
  const key = storageKey();
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Nothing to persist; the in-memory list still works for this tab.
  }
}

function notify(): void {
  snapshot = { items, unread };
  for (const listener of listeners) listener();
}

/**
 * Another tab filed a notification (or signed out and cleared the list):
 * pick its copy up so the bell shows the same history in every tab.
 */
function listenToOtherTabs(): void {
  if (storageListening) return;
  storageListening = true;
  window.addEventListener('storage', (event) => {
    const key = storageKey();
    if (!key || (event.key !== key && event.key !== null)) return;
    items = readStored() ?? items;
    notify();
  });
}

/**
 * Points the store at the signed-in driver's list (or at nothing, when
 * `userId` is null). Switching drivers drops the previous list from memory.
 */
export function setNotificationsOwner(userId: string | null): void {
  if (typeof window === 'undefined' || owner === userId) return;
  owner = userId;
  unread = 0;
  hydrated = false;
  items = [];
  hydrate();
  notify();
}

/**
 * Adds a notification to the top of the list and bumps the unread count.
 *
 * Returns false (and adds nothing) while signed out, or when an entry with
 * the same `dedupeKey` is already filed — by this tab or, since the list is
 * re-read from storage first, by another one.
 */
export function pushNotification(item: Omit<NotificationItem, 'id' | 'at'>): boolean {
  hydrate();
  if (!owner) return false;
  if (item.dedupeKey) {
    // Another tab may have filed it a moment ago without our storage event
    // having arrived yet; the stored copy is the source of truth.
    items = readStored() ?? items;
    if (items.some((existing) => existing.dedupeKey === item.dedupeKey)) {
      notify();
      return false;
    }
  }
  items = [
    { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, at: new Date().toISOString() },
    ...items,
  ].slice(0, MAX_ITEMS);
  unread += 1;
  persist();
  notify();
  return true;
}

export function markAllRead(): void {
  if (unread === 0) return;
  unread = 0;
  notify();
}

export function getSnapshot(): Snapshot {
  hydrate();
  return snapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
