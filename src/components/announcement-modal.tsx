'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { pushNotification } from '@/lib/notifications-store';
import { useI18n } from '@/components/i18n-provider';
import { useGuideActive } from '@/lib/overlay-lock';
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
 * Operator-written Мэдээ, shown once to a signed-in driver as a modal — the
 * newest one they have not dismissed yet. Closing it files the announcement
 * into the notification bell's history instead of losing it outright.
 */
export function AnnouncementModal({ userId }: { userId: string | null }) {
  const { d } = useI18n();
  const [current, setCurrent] = useState<Announcement | null>(null);
  // Held back while the spotlight guide runs; it shows once the guide ends.
  const guideActive = useGuideActive();

  useEffect(() => {
    if (!userId) return;
    const owner = userId;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch('/app-api/app/announcements', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { announcements?: Announcement[] };
        const seen = seenIds(owner);
        const unseen = (body.announcements ?? []).find((a) => !seen.has(a.id));
        if (unseen) setCurrent((prev) => prev ?? unseen);
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

  function close() {
    if (!current || !userId) return;
    markSeen(userId, current.id);
    pushNotification({
      kind: 'announcement',
      title: current.title,
      body: current.body,
      imageUrl: current.imageUrl,
    });
    setCurrent(null);
  }

  if (!current || guideActive) return null;

  return (
    <Modal onClose={close} maxWidth="sm">
      <div className="relative">
        <button
          type="button"
          onClick={close}
          aria-label={d.common.close}
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
        >
          ×
        </button>
        {current.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a one-off operator-uploaded image; not worth a remotePatterns entry.
          <img src={current.imageUrl} alt="" className="h-48 w-full object-cover" />
        ) : null}
        <div className="px-6 py-5">
          <h3 className="text-lg font-bold text-foreground">{current.title}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{current.body}</p>
        </div>
      </div>
    </Modal>
  );
}
