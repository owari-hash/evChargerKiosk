'use client';

import { useEffect } from 'react';
import { showToast } from '@/lib/toast-store';

/**
 * Shows a component's result message — an error, a success — as a toast the
 * moment it appears, instead of as a banner inside the form.
 *
 * Keyed on the text: a component clears its message before each new attempt,
 * so a repeated failure toasts again, while an ordinary re-render does not.
 */
export function useToastMessage(
  message: string | null | undefined,
  kind: 'success' | 'error' | 'info',
  title?: string,
): void {
  useEffect(() => {
    if (!message) return;
    showToast(title ? { kind, title, body: message } : { kind, title: message, body: '' });
  }, [message, kind, title]);
}
