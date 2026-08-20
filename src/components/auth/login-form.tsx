'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { fieldErrors, loginSchema } from '@/lib/validation';
import { fieldAria, sanitizeNext } from './auth-shell';

interface LoginErrorBody {
  error?: string;
  fields?: Record<string, string>;
}

export function LoginForm() {
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
      setFormError(fields._form ?? 'Please check the highlighted fields');
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as LoginErrorBody;

      if (!res.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.fields?._form ?? body.error ?? 'We could not sign you in.');
        setPending(false);
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setFormError('We could not reach the server. Check your connection and try again.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {justRegistered && (
        <Alert tone="success" title="Your account is ready">
          Sign in to pick up where you left off.
        </Alert>
      )}

      {justReset && (
        <Alert tone="success" title="Password changed">
          Sign in with your new password.
        </Alert>
      )}

      {formError && <Alert tone="danger">{formError}</Alert>}

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

      <Field label="Password" htmlFor="password" error={errors.password} required>
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label htmlFor="remember" className="flex min-h-11 items-center gap-2.5 text-sm text-foreground">
          <input
            id="remember"
            name="remember"
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="size-5 shrink-0 rounded accent-brand"
          />
          Keep me signed in
        </label>

        <Link
          href="/forgot-password"
          className="text-sm font-medium text-brand underline underline-offset-2"
        >
          Forgot your password?
        </Link>
      </div>

      <Button type="submit" size="lg" loading={pending} className="w-full">
        Sign in
      </Button>

      <p className="text-center text-sm text-muted">
        New here?{' '}
        <Link href={registerHref} className="font-medium text-brand underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </form>
  );
}
