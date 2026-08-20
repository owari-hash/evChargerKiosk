'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { useI18n } from '@/components/i18n-provider';
import { fieldErrors, registerSchema } from '@/lib/validation';
import { fieldAria, sanitizeNext } from './auth-shell';
import { DevHint } from './dev-hint';
import { PasswordStrength } from './password-strength';

interface Verification {
  sent: boolean;
  destination: string;
  devToken?: string;
}

interface RegisterResponseBody {
  verification?: Verification;
  error?: string;
  fields?: Record<string, string>;
}

export function RegisterForm() {
  const { d } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = sanitizeNext(params.get('next'));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = registerSchema.safeParse({
      name,
      email,
      phone,
      password,
      confirmPassword,
      acceptTerms,
    });

    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      setErrors(fields);
      setFormError(fields._form ?? d.auth.checkFields);
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);

    try {
      const res = await fetch('/app-api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.data, phone: parsed.data.phone || undefined }),
      });
      const body = (await res.json().catch(() => ({}))) as RegisterResponseBody;

      if (!res.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.fields?._form ?? body.error ?? d.auth.register.failed);
        setPending(false);
        return;
      }

      // Registration signs the driver in, but /register is a guest-only route: refreshing
      // here would bounce straight to /account and hide the confirmation details. The
      // header picks up the session when they continue.
      setVerification(body.verification ?? { sent: false, destination: parsed.data.email });
      setPending(false);
    } catch {
      setFormError(d.auth.networkError);
      setPending(false);
    }
  }

  function goToAccount() {
    router.replace(next);
    router.refresh();
  }

  if (verification) {
    return (
      <div className="space-y-5">
        <Alert tone="success" title={d.auth.login.accountReady}>
          {verification.sent ? (
            <>
              We sent a confirmation link to <strong>{verification.destination}</strong>. Open it to
              confirm your email address.
            </>
          ) : (
            <>
              We could not send the confirmation email to{' '}
              <strong>{verification.destination}</strong> just now. You can ask for a new link from
              your account page.
            </>
          )}
        </Alert>

        <p className="text-sm text-muted">
          You are signed in already. Confirming your email is what lets us send charging receipts
          and account notices.
        </p>

        <DevHint token={verification.devToken} linkPath="/verify-email" />

        <Button type="button" size="lg" className="w-full" onClick={goToAccount}>
          Continue to your account
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Field label={d.auth.nameLabel} htmlFor="name" error={errors.name} required>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          {...fieldAria('name', errors.name)}
        />
      </Field>

      <Field label={d.auth.emailLabel} htmlFor="email" error={errors.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={d.auth.emailPlaceholder}
          {...fieldAria('email', errors.email)}
        />
      </Field>

      <Field
        label={d.auth.phoneLabel}
        htmlFor="phone"
        error={errors.phone}
        hint={d.auth.phoneHint}
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder={d.auth.phonePlaceholder}
          {...fieldAria('phone', errors.phone, true)}
        />
      </Field>

      <Field
        label={d.auth.passwordLabel}
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
        label={d.auth.confirmPasswordLabel}
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

      <div className="space-y-1.5">
        <label
          htmlFor="acceptTerms"
          className="flex min-h-11 items-start gap-3 py-1 text-sm text-foreground"
        >
          <input
            id="acceptTerms"
            name="acceptTerms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(event) => setAcceptTerms(event.target.checked)}
            className="mt-0.5 size-5 shrink-0 rounded accent-brand"
            {...fieldAria('acceptTerms', errors.acceptTerms)}
          />
          <span>
            {d.auth.register.agreePrefix}{' '}
            <Link href="/legal/terms" className="font-medium text-brand underline underline-offset-2">
              {d.privacy.termsLink}
            </Link>{' '}
            {d.auth.register.agreeMiddle}{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-brand underline underline-offset-2"
            >
              {d.terms.privacyLink}
            </Link>
            {d.auth.register.agreeSuffix}
          </span>
        </label>
        {errors.acceptTerms && (
          <p id="acceptTerms-error" className="text-sm text-danger">
            {errors.acceptTerms}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        {d.auth.register.submit}
      </Button>

      <p className="text-center text-sm text-muted">
        {d.auth.register.haveAccount}{' '}
        <Link href="/login" className="font-medium text-brand underline underline-offset-2">
          {d.auth.login.submit}
        </Link>
      </p>
    </form>
  );
}
