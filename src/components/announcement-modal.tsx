'use client';

import { useEffect } from 'react';
import { pushNotification } from '@/lib/notifications-store';
import { showToast } from '@/lib/toast-store';
import { scopedKey } from '@/lib/user-scope';

interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
}

const SEEN_KEY = 'eplug-announcements-seen';
const POLL_MS = 5 * 60_000;

/** Dismissed announcements are remembered per driver, not per browser. */
function seenIds(userId: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(scopedKey(SEEN_KEY, userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

/** True the very first time this account has ever been checked on this
 *  browser — the key has literally never been written, as opposed to having
 *  been written and ending up empty. Distinguishes "never checked" from
 *  "checked and has seen nothing yet", which matters for the baseline below. */
function neverChecked(userId: string): boolean {
  try {
    return window.localStorage.getItem(scopedKey(SEEN_KEY, userId)) === null;
  } catch {
    return false;
  }
}

function markSeen(userId: string, id: string): void {
  try {
    const ids = seenIds(userId);
    ids.add(id);
    // Keep the set from growing forever on an account with years of history.
    window.localStorage.setItem(scopedKey(SEEN_KEY, userId), JSON.stringify([...ids].slice(-200)));
  } catch {
    // Private mode — the same announcement just shows again next visit.
  }
}

/**
 * Operator-written Мэдээ, shown as a toast and recorded in notification bell history.
 */
export function AnnouncementModal({ userId }: { userId: string | null }) {
  useEffect(() => {
    if (!userId) return;
    const owner = userId;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch('/app-api/app/announcements', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { announcements?: Announcement[] };
        const all = body.announcements ?? [];

        // First check ever for this account on this browser: whatever is
        // live right now is old news, not something that "just arrived" —
        // baseline it silently rather than replaying it as a fresh toast.
        // Written directly (not via markSeen in a loop) so the baseline marker
        // exists even when there are zero active announcements to record —
        // otherwise the very next announcement published would look like a
        // still-unchecked account and get silently swallowed too.
        if (neverChecked(owner)) {
          try {
            window.localStorage.setItem(
              scopedKey(SEEN_KEY, owner),
              JSON.stringify(all.map((a) => a.id).slice(-200)),
            );
          } catch {
            // Private mode — this just re-baselines next visit.
          }
          return;
        }

        const seen = seenIds(owner);
        const unseenList = all.filter((a) => !seen.has(a.id));
        for (const unseen of unseenList) {
          markSeen(owner, unseen.id);
          pushNotification({
            kind: 'announcement',
            title: unseen.title,
            body: unseen.body,
            imageUrl: unseen.imageUrl,
            // Shown with when it was published, not when this browser saw it;
            // the key keeps the app and the site from filing it twice.
            at: unseen.createdAt,
            dedupeKey: `announcement:${unseen.id}`,
          });
          showToast({
            kind: 'announcement',
            title: unseen.title,
            body: unseen.body,
          });
        }
      } catch {
        // Offline or a transient failure — the next poll tries again.
      }
    }

    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [userId]);

  return null;
}
