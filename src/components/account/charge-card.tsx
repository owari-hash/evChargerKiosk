'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { useI18n } from '@/components/i18n-provider';
import { formatChargeTag } from '@/lib/charge-tag';
import type { PublicUser } from '@/lib/types';

/**
 * The driver's charge tag, shown and nothing more.
 *
 * There is deliberately no way to add, remove or edit one: the tag is issued
 * with the account, works everywhere, and a driver who has to think about it at
 * all is a driver we have failed. It is on screen only so it can be read out to
 * support, or typed at a station that asks for a code.
 */
export function ChargeCard({ user }: { user: PublicUser }) {
  const { d } = useI18n();
  const t = d.account.chargeTag;
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!user.idTag) return;
    try {
      await navigator.clipboard.writeText(user.idTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the code is on screen to read anyway.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <p className="text-sm text-muted">{t.body}</p>

        {user.idTag ? (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-soft p-4 ring-1 ring-brand/25">
              <code className="flex-1 font-mono text-lg font-bold tracking-wider text-foreground">
                {formatChargeTag(user.idTag)}
              </code>
              <button
                type="button"
                onClick={() => void copy()}
                className="h-9 shrink-0 rounded-xl bg-surface px-3 text-xs font-semibold text-foreground ring-1 ring-border transition hover:bg-surface-muted"
              >
                {copied ? t.copied : t.copy}
              </button>
            </div>

            <ul className="space-y-1.5 text-sm text-muted">
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 text-brand">✓</span>
                {t.allStations}
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 text-brand">✓</span>
                {t.oneAtATime}
              </li>
              <li className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 text-brand">✓</span>
                {t.noAction}
              </li>
            </ul>
          </>
        ) : (
          <p className="rounded-2xl bg-surface-muted px-4 py-6 text-center text-sm text-muted">
            {t.pending}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
