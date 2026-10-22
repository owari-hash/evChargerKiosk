/**
 * Transient pop-ups from the background watchers (wallet, charging sessions).
 *
 * One queue for all of them, rendered by `ToastHost`, so a charge finishing
 * and its wallet deduction arriving in the same poll stack neatly instead of
 * drawing on top of each other at the same fixed position.
 */

export type ToastKind =
  | 'wallet-in'
  | 'wallet-out'
  | 'session-started'
  | 'session-finished'
  | 'announcement'
  /** The outcome of something the driver just did. */
  | 'success'
  | 'error'
  | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body: string;
  /** Clicking the toast navigates here. */
  href?: string;
}

const MAX_TOASTS = 3;

let toasts: Toast[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function showToast(toast: Omit<Toast, 'id'>): void {
  toasts = [...toasts, { ...toast, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }].slice(
    -MAX_TOASTS,
  );
  emit();
}

export function dismissToast(id: string): void {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

/** Drops every pending toast — on sign-out, so none outlives its driver. */
export function clearToasts(): void {
  if (toasts.length === 0) return;
  toasts = [];
  emit();
}

const EMPTY: Toast[] = [];

export function getToasts(): Toast[] {
  return toasts;
}

export function getServerToasts(): Toast[] {
  return EMPTY;
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
