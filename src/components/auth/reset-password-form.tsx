'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, ButtonLink, Field, Input } from '@/components/ui';
import { fieldErrors, resetPasswordSchema } from '@/lib/validation';
import { fieldAria } from './auth-shell';
import { DevHint } from './dev-hint';
import { PasswordStrength } from './password-strength';

interface ResetResponseBody {
  error?: string;
  fields?: Record<string, string>;
}

interface ResendState {
  tone: 'info' | 'danger';
  message: string;
  devCode?: string;
}

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const tokenMode = token.length > 0;

  const [phone, setPhone] = useState(params.get('phone') ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [resend, setResend] = useState<ResendState | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = tokenMode
      ? { token, password, confirmPassword }
      : { phone: phone.trim(), code: code.trim(), password, confirmPassword };

    const parsed = resetPasswordSchema.safeParse(payload);
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      if (!tokenMode) {
        // The "token or phone + code" rule reports on `token`, which this mode never shows.
        delete fields.token;
        if (!phone.trim()) fields.phone = 'Enter the phone number you used';
      }
      setErrors(fields);
      setFormError(fields._form ?? 'Please check the highlighted fields');
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);

    try {
      const res = await fetch('/app-api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as ResetResponseBody;

      if (!res.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.fields?._form ?? body.error ?? 'We could not change your password.');
        setPending(false);
        return;
      }

      setDone(true);
      setPending(false);
    } catch {
      setFormError('We could not reach the server. Check your connection and try again.');
      setPending(false);
    }
  }

  async function resendCode() {
    if (!phone.trim()) {
      setErrors((current) => ({ ...current, phone: 'Enter the phone number you used' }));
      setFormError('Enter your phone number so we know where to text the code');
      return;
    }

    setResend(null);
    setResending(true);

    try {
      const res = await fetch('/app-api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: phone.trim(), channel: 'sms' }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        devCode?: string;
        error?: string;
      };

      setResend(
        res.ok
          ? {
              tone: 'info',
              message: body.message ?? 'If that number is on file, a new code is on its way.',
              devCode: body.devCode,
            }
          : { tone: 'danger', message: body.error ?? 'We could not send a new code just now.' },
      );
    } catch {
      setResend({ tone: 'danger', message: 'We could not reach the server. Try again shortly.' });
    } finally {
      setResending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title="Password changed">
          You can sign in with your new password now.
        </Alert>

        <p className="text-sm text-muted">
          For your safety every other device was signed out. You will need to sign in again on your
          phone, tablet or any charging kiosk you use.
        </p>

        <ButtonLink href="/login?reset=1" size="lg" className="w-full">
          Go to sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <Alert tone="danger">{formError}</Alert>}

      {!tokenMode && (
        <>
          <Alert tone="info">
            Enter the 6-digit code we texted you, then choose a new password.
          </Alert>

          <Field label="Phone number" htmlFor="phone" error={errors.phone} required>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="9911 2233"
              {...fieldAria('phone', errors.phone)}
            />
          </Field>

          <Field
            label="6-digit code"
            htmlFor="code"
            error={errors.code}
            hint="It expires 10 minutes after we send it."
            required
          >
            <Input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center font-mono tracking-[0.4em]"
              {...fieldAria('code', errors.code, true)}
            />
          </Field>

          <div className="space-y-3">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full"
              loading={resending}
              onClick={resendCode}
            >
              Resend the code
            </Button>
            {resend && (
              <>
                <Alert tone={resend.tone}>{resend.message}</Alert>
                <DevHint code={resend.devCode} />
              </>
            )}
          </div>
        </>
      )}

      <Field
        label="New password"
        htmlFor="password"
        error={errors.password}
        hint="At least 8 characters, including a letter and a number."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          {...fieldAria('password', errors.password, true)}
        />
        <PasswordStrength password={password} className="pt-1" />
      </Field>

      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword}
        required
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          {...fieldAria('confirmPassword', errors.confirmPassword)}
        />
      </Field>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Change password
      </Button>

      <p className="text-center text-sm text-muted">
        Link expired?{' '}
        <Link
          href="/forgot-password"
          className="font-medium text-brand underline underline-offset-2"
        >
          Request a new one
        </Link>
      </p>
    </form>
  );
}
