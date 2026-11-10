'use client';

import { useSyncExternalStore } from 'react';
import { showToast } from './toast-store';

/**
 * The signed-in driver's starred stations. Loaded once per driver (UserScope
 * points it at whoever is signed in), changed optimistically, and rolled back
 * if the API says no.
 */

interface FavoritesState {
  owner: string | null;
  ids: ReadonlySet<string>;
}

let state: FavoritesState = { owner: null, ids: new Set() };
const listeners = new Set<() => void>();
const SERVER_STATE: FavoritesState = { owner: null, ids: new Set() };

function set(next: FavoritesState) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called by UserScope whenever the signed-in driver changes. */
export function setFavoritesOwner(userId: string | null): void {
  if (userId === state.owner) return;
  set({ owner: userId, ids: new Set() });
  if (!userId) return;
  fetch('/app-api/account/favorites', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { stationIds?: string[] } | null) => {
      if (state.owner === userId && j?.stationIds) set({ owner: userId, ids: new Set(j.stationIds) });
    })
    .catch(() => undefined);
}

export function useFavorites(): FavoritesState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

const COPY = {
  mn: { added: 'Дуртай станцад нэмэгдлээ', removed: 'Дуртай станцаас хасагдлаа', failed: 'Хадгалж чадсангүй. Дахин оролдоно уу.' },
  en: { added: 'Added to favourites', removed: 'Removed from favourites', failed: 'Could not save. Please try again.' },
};

export async function toggleFavorite(stationId: string, locale: string): Promise<void> {
  const t = COPY[locale === 'en' ? 'en' : 'mn'];
  const owner = state.owner;
  if (!owner) return;
  const had = state.ids.has(stationId);
  const optimistic = new Set(state.ids);
  if (had) optimistic.delete(stationId);
  else optimistic.add(stationId);
  set({ owner, ids: optimistic });

  try {
    const res = await fetch(`/app-api/account/favorites/${encodeURIComponent(stationId)}`, {
      method: had ? 'DELETE' : 'PUT',
    });
    const j = (await res.json().catch(() => ({}))) as { stationIds?: string[]; error?: string };
    if (!res.ok) throw new Error(j.error || t.failed);
    if (state.owner === owner && j.stationIds) set({ owner, ids: new Set(j.stationIds) });
    showToast({ kind: 'success', title: had ? t.removed : t.added, body: '' });
  } catch (err) {
    if (state.owner === owner) {
      const back = new Set(state.ids);
      if (had) back.add(stationId);
      else back.delete(stationId);
      set({ owner, ids: back });
    }
    showToast({ kind: 'error', title: err instanceof Error ? err.message : t.failed, body: '' });
  }
}
