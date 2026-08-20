'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
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
      setFormError(fields._form ?? 'Please check the highlighted fields');
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed.data, phone: parsed.data.phone || undefined }),
      });
      const body = (await res.json().catch(() => ({}))) as RegisterResponseBody;

      if (!res.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.fields?._form ?? body.error ?? 'We could not create your account.');
        setPending(false);
        return;
      }

      // Registration signs the driver in, but /register is a guest-only route: refreshing
      // here would bounce straight to /account and hide the confirmation details. The
      // header picks up the session when they continue.
      setVerification(body.verification ?? { sent: false, destination: parsed.data.email });
      setPending(false);
    } catch {
      setFormError('We could not reach the server. Check your connection and try again.');
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
        <Alert tone="success" title="Your account is ready">
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

      <Field label="Full name" htmlFor="name" error={errors.name} required>
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

      <Field label="Email address" htmlFor="email" error={errors.email} required>
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
          placeholder="you@example.com"
          {...fieldAria('email', errors.email)}
        />
      </Field>

      <Field
        label="Phone number"
        htmlFor="phone"
        error={errors.phone}
        hint="Optional. Used for SMS reset codes — type your local number and the country code is added for you."
      >
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="9911 2233"
          {...fieldAria('phone', errors.phone, true)}
        />
      </Field>

      <Field
        label="Password"
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
        label="Confirm password"
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
            I agree to the{' '}
            <Link href="/legal/terms" className="font-medium text-brand underline underline-offset-2">
              terms of service
            </Link>{' '}
            and the{' '}
            <Link
              href="/legal/privacy"
              className="font-medium text-brand underline underline-offset-2"
            >
              privacy policy
            </Link>
            .
          </span>
        </label>
        {errors.acceptTerms && (
          <p id="acceptTerms-error" className="text-sm text-danger">
            {errors.acceptTerms}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Create account
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
