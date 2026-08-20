'use client';

import Link from 'next/link';
import { useI18n } from '@/components/i18n-provider';

interface DevHintProps {
  /** Link secret the API echoed back because email delivery is not configured. */
  token?: string;
  /** One-time code the API echoed back because SMS delivery is not configured. */
  code?: string;
  /** Page the token unlocks, so the panel can offer a ready-made link. */
  linkPath?: '/reset-password' | '/verify-email';
}

/**
 * Development-only escape hatch: the API returns the secret it would otherwise have
 * emailed or texted, and this panel puts it in front of whoever is testing.
 */
export function DevHint({ token, code, linkPath }: DevHintProps) {
  const { d } = useI18n();

  if (!token && !code) return null;

  const href = token && linkPath ? `${linkPath}?token=${encodeURIComponent(token)}` : null;

  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-muted/60 p-4">
      <p className="text-sm font-semibold text-foreground">{d.auth.devHelper}</p>
      <p className="mt-1 text-sm text-muted">
        {d.auth.devHintBody}
      </p>

      {code && (
        <p className="mt-3 font-mono tracking-[0.35em] text-foreground">
          <span className="sr-only">{d.auth.yourCodeIs} </span>
          {code}
        </p>
      )}

      {href && (
        <p className="mt-3">
          <Link href={href} className="font-medium text-brand underline underline-offset-2">
            Open the link
          </Link>
        </p>
      )}

      {token && <p className="mt-2 break-all font-mono text-xs text-muted">{token}</p>}
    </div>
  );
}
