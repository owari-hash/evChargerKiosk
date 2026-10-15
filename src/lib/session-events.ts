/**
 * The glue between the station page's charging flow and the background
 * `SessionWatcher`.
 *
 * - The flow asks for an immediate check right after its own Start / Stop, so
 *   the bell does not lag the station by a whole poll interval.
 * - The flow says which session it is already showing (and that it just
 *   asked a station to start one). The watcher still files those events in the
 *   bell, but skips the pop-up: the driver is looking at the same news in the
 *   flow's own "charging" / "done" step, and two announcements of one event
 *   read as two events.
 */

const CHECK_EVENT = 'eplug:session-check';
/** How long after a Start request a new session counts as "the one the flow started". */
const START_WINDOW_MS = 3 * 60_000;

const onScreen = new Map<number, number>();
let startRequestedAt = 0;
let flowsMounted = 0;

/** Ask the watcher to poll now (and a few times shortly after, for start handshakes). */
export function requestSessionCheck(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CHECK_EVENT));
}

export function onSessionCheckRequest(listener: () => void): () => void {
  window.addEventListener(CHECK_EVENT, listener);
  return () => window.removeEventListener(CHECK_EVENT, listener);
}

/** The charging flow is on screen; returns its unmount cleanup. */
export function registerChargingFlow(): () => void {
  flowsMounted += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    flowsMounted -= 1;
    if (flowsMounted === 0) startRequestedAt = 0;
  };
}

/** The flow just had a station accept a Start request. */
export function noteStartRequested(): void {
  startRequestedAt = Date.now();
}

/** The flow is displaying this session; returns the cleanup for when it stops. */
export function showSessionOnScreen(transactionId: number): () => void {
  onScreen.set(transactionId, (onScreen.get(transactionId) ?? 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const n = (onScreen.get(transactionId) ?? 1) - 1;
    if (n <= 0) onScreen.delete(transactionId);
    else onScreen.set(transactionId, n);
  };
}

/**
 * True when the station page already shows this event itself, so the
 * watcher should file it quietly (bell only, no toast).
 */
export function shownByChargingFlow(transactionId: number, event: 'started' | 'finished'): boolean {
  if (onScreen.has(transactionId)) return true;
  return (
    event === 'started' && flowsMounted > 0 && Date.now() - startRequestedAt < START_WINDOW_MS
  );
}
