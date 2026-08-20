'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, ButtonLink, Field, Input } from '@/components/ui';
import { useI18n } from '@/components/i18n-provider';
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
  const { d } = useI18n();
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
        if (!phone.trim()) fields.phone = d.auth.reset.needPhone;
      }
      setErrors(fields);
      setFormError(fields._form ?? d.auth.checkFields);
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
        setFormError(body.fields?._form ?? body.error ?? d.auth.reset.failed);
        setPending(false);
        return;
      }

      setDone(true);
      setPending(false);
    } catch {
      setFormError(d.auth.networkError);
      setPending(false);
    }
  }

  async function resendCode() {
    if (!phone.trim()) {
      setErrors((current) => ({ ...current, phone: d.auth.reset.needPhone }));
      setFormError(d.auth.reset.needPhoneToResend);
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
              message: body.message ?? d.auth.reset.resent,
              devCode: body.devCode,
            }
          : { tone: 'danger', message: body.error ?? d.auth.reset.resendFailed },
      );
    } catch {
      setResend({ tone: 'danger', message: d.auth.reset.retryShortly });
    } finally {
      setResending(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title={d.auth.reset.passwordChanged}>
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

          <Field label={d.auth.phoneLabel} htmlFor="phone" error={errors.phone} required>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={d.auth.phonePlaceholder}
              {...fieldAria('phone', errors.phone)}
            />
          </Field>

          <Field
            label={d.auth.reset.codeLabel}
            htmlFor="code"
            error={errors.code}
            hint={d.auth.reset.codeHint}
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
              {d.auth.reset.resend}
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
        label={d.auth.reset.newPasswordLabel}
        htmlFor="password"
        error={errors.password}
        hint={d.auth.passwordHint}
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
        label={d.auth.reset.confirmNewLabel}
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
