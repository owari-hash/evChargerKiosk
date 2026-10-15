'use client';

import { useEffect } from 'react';
import { setNotificationsOwner } from '@/lib/notifications-store';
import { clearToasts } from '@/lib/toast-store';
import { dropLegacyKeys } from '@/lib/user-scope';

/**
 * Points the browser-side stores at whoever is signed in right now. When the
 * driver signs out (or someone else signs in) the layout re-renders with a
 * different user, and the previous driver's bell list and pending toasts are
 * dropped from memory at once — not only after a full reload.
 */
export function UserScope({ userId }: { userId: string | null }) {
  useEffect(() => {
    dropLegacyKeys();
  }, []);

  useEffect(() => {
    setNotificationsOwner(userId);
    return () => clearToasts();
  }, [userId]);

  return null;
}
