'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { useI18n } from '@/components/i18n-provider';
import { fieldErrors, loginSchema } from '@/lib/validation';
import { fieldAria, sanitizeNext } from './auth-shell';

interface LoginErrorBody {
  error?: string;
  fields?: Record<string, string>;
}

export function LoginForm() {
  const { d } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  const next = sanitizeNext(params.get('next'));
  const justRegistered = params.get('registered') === '1';
  const justReset = params.get('reset') === '1';
  const registerHref = next === '/account' ? '/register' : `/register?next=${encodeURIComponent(next)}`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = loginSchema.safeParse({ email, password, remember });
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
      const res = await fetch('/app-api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as LoginErrorBody;

      if (!res.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.fields?._form ?? body.error ?? d.auth.login.failed);
        setPending(false);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setFormError(d.auth.networkError);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {justRegistered && (
        <Alert tone="success" title={d.auth.login.accountReady}>
          Sign in to pick up where you left off.
        </Alert>
      )}

      {justReset && (
        <Alert tone="success" title={d.auth.login.passwordChanged}>
          Sign in with your new password.
        </Alert>
      )}

      {formError && <Alert tone="danger">{formError}</Alert>}

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

      <Field label={d.auth.passwordLabel} htmlFor="password" error={errors.password} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          {...fieldAria('password', errors.password)}
        />
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
        <label htmlFor="remember" className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-4 shrink-0 rounded accent-brand"
          />
          {d.auth.login.keepSignedIn}
        </label>

        <Link
          href="/forgot-password"
          className="text-xs font-medium text-brand underline underline-offset-2"
        >
          {d.auth.login.forgotPassword}
        </Link>
      </div>

      <Button type="submit" size="lg" loading={pending} className="w-full mt-2">
        {d.auth.login.submit}
      </Button>

      <p className="text-center text-xs text-muted pt-1">
        {d.auth.login.newHere}{' '}
        <Link href={registerHref} className="font-medium text-brand underline underline-offset-2">
          {d.auth.login.createAccount}
        </Link>
      </p>
    </form>
  );
}
