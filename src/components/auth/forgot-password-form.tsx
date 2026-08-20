'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Alert, Button, ButtonLink, Field, Input, Select } from '@/components/ui';
import { fieldErrors, forgotPasswordSchema } from '@/lib/validation';
import { fieldAria } from './auth-shell';
import { DevHint } from './dev-hint';

type Channel = 'auto' | 'email' | 'sms';

interface ForgotResponseBody {
  channel?: 'email' | 'sms' | null;
  destination?: string;
  message?: string;
  devToken?: string;
  devCode?: string;
  error?: string;
  fields?: Record<string, string>;
}

export function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState('');
  const [channel, setChannel] = useState<Channel>('auto');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<ForgotResponseBody | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = forgotPasswordSchema.safeParse({ identifier, channel });
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      setErrors(fields);
      setFormError(fields._form ?? 'Please check the highlighted fields');
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as ForgotResponseBody;

      if (!res.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.fields?._form ?? body.error ?? 'We could not send the reset instructions.');
        setPending(false);
        return;
      }

      setSent(body);
      setPending(false);
    } catch {
      setFormError('We could not reach the server. Check your connection and try again.');
      setPending(false);
    }
  }

  if (sent) {
    const heading =
      sent.channel === 'sms'
        ? 'Check your phone'
        : sent.channel === 'email'
          ? 'Check your email'
          : 'Check your messages';

    return (
      <div className="space-y-5">
        <Alert tone="success" title={heading}>
          {sent.message ?? 'If that account exists, reset instructions are on their way.'}
          {sent.destination && (
            <>
              {' '}
              Sent to <strong>{sent.destination}</strong>.
            </>
          )}
        </Alert>

        {sent.channel === 'sms' && (
          <>
            <p className="text-sm text-muted">
              The code is six digits and expires shortly, so enter it soon.
            </p>
            <ButtonLink
              href={`/reset-password?phone=${encodeURIComponent(identifier.trim())}`}
              size="lg"
              className="w-full"
            >
              Enter the code
            </ButtonLink>
          </>
        )}

        {sent.channel === 'email' && (
          <p className="text-sm text-muted">
            The link is single-use and expires in 30 minutes. Look in your spam folder if it has not
            arrived after a few minutes.
          </p>
        )}

        <DevHint token={sent.devToken} code={sent.devCode} linkPath="/reset-password" />

        <div className="space-y-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => setSent(null)}
          >
            Try a different address
          </Button>
          <p className="text-center text-sm text-muted">
            Remembered it?{' '}
            <Link href="/login" className="font-medium text-brand underline underline-offset-2">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Field
        label="Email or phone number"
        htmlFor="identifier"
        error={errors.identifier}
        hint="Whichever you used when you created the account."
        required
      >
        <Input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="you@example.com or 9911 2233"
          {...fieldAria('identifier', errors.identifier, true)}
        />
      </Field>

      <Field
        label="How should we send it?"
        htmlFor="channel"
        error={errors.channel}
        hint="An email carries a reset link; an SMS carries a 6-digit code."
      >
        <Select
          id="channel"
          name="channel"
          value={channel}
          onChange={(event) => setChannel(event.target.value as Channel)}
          {...fieldAria('channel', errors.channel, true)}
        >
          <option value="auto">Whichever suits my account</option>
          <option value="email">Email me a link</option>
          <option value="sms">Text me a code</option>
        </Select>
      </Field>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Send reset instructions
      </Button>

      <p className="text-center text-sm text-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-brand underline underline-offset-2">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
