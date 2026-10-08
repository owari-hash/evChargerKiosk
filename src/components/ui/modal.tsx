'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const WIDTHS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
} as const;

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: keyof typeof WIDTHS;
}

/** The one modal shell every overlay in the app builds on: backdrop, Escape
 * to close, body-scroll lock, and the fade-and-settle entrance. What goes
 * inside — including its own header and close button — is up to the caller.
 *
 * Portaled straight to `document.body`: wherever in the tree this is opened
 * from, a `position: fixed` backdrop only ever covers the whole viewport if
 * nothing between it and `<body>` sets a transform, filter or similar — one
 * such ancestor anywhere up the tree and the backdrop silently scopes itself
 * to that box instead. The portal makes that a non-issue. */
export function Modal({ onClose, children, maxWidth = 'md' }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = original;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`modal-pop w-full ${WIDTHS[maxWidth]} overflow-hidden rounded-3xl bg-surface shadow-2xl ring-1 ring-border`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

interface ModalHeaderProps {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
}

/** The header every modal opens with: an optional icon chip, title, a line
 * under it, and the close button in the one place drivers expect it. */
export function ModalHeader({ title, subtitle, icon, onClose, closeLabel = 'Хаах' }: ModalHeaderProps) {
  return (
    <div className="flex items-start gap-3.5 border-b border-border px-6 py-5">
      {icon}
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="shrink-0 rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-foreground"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}
