'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, ButtonLink } from '@/components/ui';
import { useI18n } from '@/components/i18n-provider';
import { DevHint } from './dev-hint';

type Status = 'verifying' | 'verified' | 'failed';

interface ResendState {
  tone: 'info' | 'danger';
  message: string;
  needsSignIn?: boolean;
  devToken?: string;
}

export function VerifyEmailPanel() {
  const { d } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'failed');
  const [message, setMessage] = useState(
    token ? '' : d.auth.verify.missingToken,
  );
  const [resending, setResending] = useState(false);
  const [resend, setResend] = useState<ResendState | null>(null);

  // React runs effects twice in development; the token is single-use, so only the
  // first pass may spend it.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    let active = true;

    (async () => {
      try {
        const res = await fetch('/app-api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!active) return;

        if (!res.ok) {
          setStatus('failed');
          setMessage(
            body.error ?? d.auth.verify.invalidToken,
          );
          return;
        }

        setStatus('verified');
        router.refresh();
      } catch {
        if (!active) return;
        setStatus('failed');
        setMessage(d.auth.networkError);
      }
    })();

    return () => {
      active = false;
    };
  }, [router, token]);

  async function requestNewLink() {
    setResend(null);
    setResending(true);

    try {
      const res = await fetch('/app-api/auth/resend-verification', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as {
        destination?: string;
        devToken?: string;
        error?: string;
      };

      if (res.status === 401) {
        setResend({
          tone: 'danger',
          message:
            d.auth.verify.signInFirst,
          needsSignIn: true,
        });
        return;
      }

      if (!res.ok) {
        setResend({
          tone: 'danger',
          message: body.error ?? d.auth.verify.resendFailed,
        });
        return;
      }

      setResend({
        tone: 'info',
        message: body.destination
          ? d.auth.verify.resentTo.replace('{destination}', body.destination)
          : d.auth.verify.resent,
        devToken: body.devToken,
      });
    } catch {
      setResend({ tone: 'danger', message: d.auth.verify.retryShortly });
    } finally {
      setResending(false);
    }
  }

  if (status === 'verifying') {
    return (
      <div className="flex items-center gap-3 py-2" aria-live="polite">
        <span
          aria-hidden
          className="size-5 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent"
        />
        <p className="text-sm text-muted">{d.auth.verify.confirming}</p>
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="space-y-5">
        <Alert tone="success" title={d.auth.verify.confirmed}>
          {d.auth.verify.confirmedBody}
        </Alert>

        <ButtonLink href="/account" size="lg" className="w-full">
          {d.auth.verify.goToAccount}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Alert tone="danger" title={d.auth.verify.failedTitle}>
        {message}
      </Alert>

      <Button
        type="button"
        size="lg"
        className="w-full"
        loading={resending}
        onClick={requestNewLink}
      >
        {d.auth.verify.resend}
      </Button>

      {resend && (
        <div className="space-y-3">
          <Alert tone={resend.tone}>{resend.message}</Alert>
          {resend.needsSignIn && (
            <ButtonLink
              href="/login?next=%2Faccount"
              variant="secondary"
              size="lg"
              className="w-full"
            >
              Sign in
            </ButtonLink>
          )}
          <DevHint token={resend.devToken} linkPath="/verify-email" />
        </div>
      )}

      <p className="text-center text-sm text-muted">
        {d.auth.verify.needSomethingElse}{' '}
        <Link href="/help" className="font-medium text-brand underline underline-offset-2">
          {d.auth.login.getHelp}
        </Link>
      </p>
    </div>
  );
}
