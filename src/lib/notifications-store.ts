/**
 * The driver's own notification history — wallet changes and announcements —
 * shared between the header's bell button and whatever is polling for new
 * ones. A plain module-level store rather than React Context: the poller and
 * the bell are siblings under the root layout, and a store avoids having to
 * wrap the whole app in a provider for what is, in the end, one small list.
 */

export interface NotificationItem {
  id: string;
  kind: 'wallet' | 'announcement';
  title: string;
  body: string;
  imageUrl?: string | null;
  at: string;
}

const STORAGE_KEY = 'eplug-notifications';
const MAX_ITEMS = 50;

interface Snapshot {
  items: NotificationItem[];
  unread: number;
}

let items: NotificationItem[] = [];
let unread = 0;
let hydrated = false;
// useSyncExternalStore requires getSnapshot() to return the same reference
// until something actually changes — a fresh object on every call looks like
// a change on every render and loops forever. This is that cached reference.
let snapshot: Snapshot = { items, unread };
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) items = parsed;
    }
  } catch {
    // Private mode or corrupt data — starts from an empty list.
  }
  snapshot = { items, unread };
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // Nothing to persist; the in-memory list still works for this tab.
  }
}

function notify(): void {
  snapshot = { items, unread };
  for (const listener of listeners) listener();
}

/** Adds a notification to the top of the list and bumps the unread count. */
export function pushNotification(item: Omit<NotificationItem, 'id' | 'at'>): void {
  hydrate();
  items = [{ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, at: new Date().toISOString() }, ...items].slice(
    0,
    MAX_ITEMS,
  );
  unread += 1;
  persist();
  notify();
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
