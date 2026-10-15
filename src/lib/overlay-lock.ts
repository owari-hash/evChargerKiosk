import { useSyncExternalStore } from 'react';

/**
 * Who owns the screen: any open Modal, or the spotlight guide. They never
 * share it — the guide waits for modals to close before it auto-starts, and
 * the announcement modal holds back while the guide runs — so one Escape or
 * close never lands on both.
 */

let openModals = 0;
let guideActive = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeOverlays(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Registers an open modal; call the returned function when it closes. */
export function registerModal(): () => void {
  openModals += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    openModals -= 1;
    emit();
  };
}

export function anyModalOpen(): boolean {
  return openModals > 0;
}

export function setGuideActive(active: boolean): void {
  if (guideActive === active) return;
  guideActive = active;
  emit();
}

export function isGuideActive(): boolean {
  return guideActive;
}

export function useGuideActive(): boolean {
  return useSyncExternalStore(subscribeOverlays, isGuideActive, () => false);
}
