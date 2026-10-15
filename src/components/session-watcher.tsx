'use client';

import { useEffect, useRef } from 'react';
import { format, useI18n } from '@/components/i18n-provider';
import { pushNotification } from '@/lib/notifications-store';
import { onSessionCheckRequest, shownByChargingFlow } from '@/lib/session-events';
import { showToast } from '@/lib/toast-store';
import type { ChargingSession } from '@/lib/types';
import { formatKwh, formatMoney, intlLocale } from '@/lib/utils';

const POLL_MS = 15_000;
/** Only the newest few matter: a start or a stop is always at the top. */
const LIMIT = 5;
/** Extra checks after the site's own Start / Stop, while the station answers. */
const FOLLOW_UPS_MS = [2_500, 6_000, 12_000];
/** A session is priced a moment after it stops; wait this long for the cost. */
const COST_WAIT_MS = 45_000;
const COST_RECHECK_MS = 5_000;

const SESSIONS_HREF = '/account/sessions';

type SessionEvent = 'started' | 'finished';

interface Tracked {
  status: ChargingSession['status'];
  /** Set once a finish has been seen but not announced yet (waiting on the cost). */
  finishSeenAt?: number;
}

/**
 * Tells the signed-in driver when one of their charging sessions starts and
 * when it finishes — wherever on the site they are, not only on the station
 * page — with a toast and an entry in the notification bell.
 *
 * Polls their newest few sessions while the tab is visible (there is no
 * driver-facing event stream) and compares each one's status with the last
 * poll. The first poll after mounting is a silent baseline, so sessions that
 * were already running or long finished never announce themselves.
 *
 * Duplicates are stopped by the notification store: each event carries a
 * `session:<id>:<event>` key, and only the first poll — in whichever tab —
 * that files it gets to show the toast.
 *
 * Mounted (keyed by user id) for signed-in drivers only.
 */
export function SessionWatcher() {
  const { d, locale } = useI18n();
  const copyRef = useRef({ d, locale });
  useEffect(() => {
    copyRef.current = { d, locale };
  }, [d, locale]);

  useEffect(() => {
    let cancelled = false;
    /** transactionId → last status seen; null until the silent baseline. */
    let tracked: Map<number, Tracked> | null = null;
    let inFlight = false;
    let pollAgain = false;
    const timers = new Set<number>();

    function later(ms: number) {
      const id = window.setTimeout(() => {
        timers.delete(id);
        void poll();
      }, ms);
      timers.add(id);
    }

    function announce(session: ChargingSession, event: SessionEvent) {
      const { d: copy, locale: current } = copyRef.current;
      const intl = intlLocale(current);
      const station = session.stationName?.trim() || copy.notifications.unknownStation;
      const title = event === 'started' ? copy.notifications.sessionStarted : copy.notifications.sessionFinished;
      const body =
        event === 'started'
          ? format(copy.notifications.sessionStartedBody, { station })
          : [
              station,
              formatKwh(session.energyKwh, intl),
              session.cost != null ? formatMoney(session.cost, intl) : null,
            ]
              .filter(Boolean)
              .join(' · ');

      const filed = pushNotification({
        kind: event === 'started' ? 'session-started' : 'session-finished',
        title,
        body,
        href: SESSIONS_HREF,
        dedupeKey: `session:${session.transactionId}:${event}`,
      });
      // Already filed (an earlier poll or another tab), or the station page
      // is showing this very event in its own flow: the bell is enough.
      if (!filed || shownByChargingFlow(session.transactionId, event)) return;
      showToast({
        kind: event === 'started' ? 'session-started' : 'session-finished',
        title,
        body,
        href: SESSIONS_HREF,
      });
    }

    function compare(sessions: ChargingSession[], previous: Map<number, Tracked>): Map<number, Tracked> {
      const next = new Map<number, Tracked>();
      let waitingOnCost = false;
      const now = Date.now();

      for (const session of sessions) {
        const id = session.transactionId;
        // A session first seen already finished started and stopped between
        // two polls (say, while the tab was hidden): it still deserves its
        // "finished", so it is treated as having been active.
        const prev: Tracked | undefined =
          previous.get(id) ??
          (session.status === 'Completed' || session.status === 'Refunded' ? { status: 'Active' } : undefined);

        if (session.status === 'Active') {
          if (!prev) announce(session, 'started');
          next.set(id, { status: 'Active' });
          continue;
        }

        const finished = session.status === 'Completed' || session.status === 'Refunded';
        if (prev?.status === 'Active' && finished) {
          const seenAt = prev.finishSeenAt ?? now;
          if (session.cost == null && now - seenAt < COST_WAIT_MS) {
            next.set(id, { status: 'Active', finishSeenAt: seenAt });
            waitingOnCost = true;
            continue;
          }
          announce(session, 'finished');
        }
        // Rejected, or a later Completed → Refunded change: tracked, not announced.
        next.set(id, { status: session.status });
      }

      if (waitingOnCost) later(COST_RECHECK_MS);
      return next;
    }

    async function poll() {
      if (cancelled || document.visibilityState === 'hidden') return;
      if (inFlight) {
        pollAgain = true;
        return;
      }
      inFlight = true;
      try {
        const res = await fetch(`/app-api/sessions?limit=${LIMIT}`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { sessions?: ChargingSession[] };
        const sessions = Array.isArray(body.sessions) ? body.sessions : [];
        if (cancelled) return;
        tracked = tracked
          ? compare(sessions, tracked)
          : new Map(sessions.map((s) => [s.transactionId, { status: s.status }]));
      } catch {
        // Offline or a transient failure — the next poll tries again.
      } finally {
        inFlight = false;
        if (pollAgain && !cancelled) {
          pollAgain = false;
          void poll();
        }
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') void poll();
    }

    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    document.addEventListener('visibilitychange', onVisibility);
    const offCheck = onSessionCheckRequest(() => {
      void poll();
      for (const ms of FOLLOW_UPS_MS) later(ms);
    });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      for (const id of timers) window.clearTimeout(id);
      document.removeEventListener('visibilitychange', onVisibility);
      offCheck();
    };
  }, []);

  return null;
}
