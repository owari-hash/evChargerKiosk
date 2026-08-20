'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Alert, Button, ButtonLink } from '@/components/ui';
import { DevHint } from './dev-hint';

type Status = 'verifying' | 'verified' | 'failed';

interface ResendState {
  tone: 'info' | 'danger';
  message: string;
  needsSignIn?: boolean;
  devToken?: string;
}

export function VerifyEmailPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'failed');
  const [message, setMessage] = useState(
    token ? '' : 'This link is missing its confirmation token. Open the link from the email again.',
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
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!active) return;

        if (!res.ok) {
          setStatus('failed');
          setMessage(
            body.error ?? 'This confirmation link is no longer valid. It may have expired already.',
          );
          return;
        }

        setStatus('verified');
        router.refresh();
      } catch {
        if (!active) return;
        setStatus('failed');
        setMessage('We could not reach the server. Check your connection and try again.');
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
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as {
        destination?: string;
        devToken?: string;
        error?: string;
      };

      if (res.status === 401) {
        setResend({
          tone: 'danger',
          message:
            'We can only send a new link to a signed-in account. Sign in first, then ask again.',
          needsSignIn: true,
        });
        return;
      }

      if (!res.ok) {
        setResend({
          tone: 'danger',
          message: body.error ?? 'We could not send a new link just now. Try again shortly.',
        });
        return;
      }

      setResend({
        tone: 'info',
        message: body.destination
          ? `A new confirmation link is on its way to ${body.destination}.`
          : 'A new confirmation link is on its way.',
        devToken: body.devToken,
      });
    } catch {
      setResend({ tone: 'danger', message: 'We could not reach the server. Try again shortly.' });
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
        <p className="text-sm text-muted">Confirming your email address…</p>
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="space-y-5">
        <Alert tone="success" title="Email confirmed">
          Thanks — your address is verified, so charging receipts and account notices can reach you.
        </Alert>

        <ButtonLink href="/account" size="lg" className="w-full">
          Go to your account
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Alert tone="danger" title="We could not confirm this link">
        {message}
      </Alert>

      <Button
        type="button"
        size="lg"
        className="w-full"
        loading={resending}
        onClick={requestNewLink}
      >
        Send a new link
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
        Need something else?{' '}
        <Link href="/help" className="font-medium text-brand underline underline-offset-2">
          Get help
        </Link>
      </p>
    </div>
  );
}
