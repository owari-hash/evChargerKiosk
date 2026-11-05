/**
 * The full-screen "top-up succeeded / failed" moment. Any top-up flow calls
 * `showTopUpResult`; the overlay mounted in the root layout plays it.
 */
export type TopUpResult =
  | { kind: 'success'; amount: number; balance?: number | null }
  | { kind: 'fail'; reason?: string };

type Shown = TopUpResult & { id: number };

let current: Shown | null = null;
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function showTopUpResult(result: TopUpResult): void {
  current = { ...result, id: ++seq };
  emit();
}

export function dismissTopUpResult(): void {
  current = null;
  emit();
}

export function subscribeTopUpResult(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTopUpResult(): Shown | null {
  return current;
}
