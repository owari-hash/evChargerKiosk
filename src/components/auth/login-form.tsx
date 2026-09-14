'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Field, Input } from '@/components/ui';
import { useI18n } from '@/components/i18n-provider';
import { phoneSchema } from '@/lib/validation';
import { fieldAria, sanitizeNext } from './auth-shell';
import { PinInput } from './pin-input';

interface LoginErrorBody {
  error?: string;
  fields?: Record<string, string>;
}

export function LoginForm() {
  const { d } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  const next = sanitizeNext(params.get('next'));
  const registerHref = next === '/account' ? '/register' : `/register?next=${encodeURIComponent(next)}`;

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const forgotHref = phone.trim()
    ? `/forgot-password?phone=${encodeURIComponent(phone.trim())}`
    : '/forgot-password';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const parsed = phoneSchema.safeParse(phone);
    const local: Record<string, string> = {};
    if (!parsed.success) local.phone = parsed.error.issues[0]?.message ?? d.auth.checkFields;
    if (!/^\d{4}$/.test(pin)) local.pin = d.auth.pinHint;
    if (!parsed.success || Object.keys(local).length > 0) {
      setErrors(local);
      setFormError(d.auth.checkFields);
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);

    try {
      const res = await fetch('/app-api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: parsed.data, pin }),
      });
      const body = (await res.json().catch(() => ({}))) as LoginErrorBody;

      if (!res.ok) {
        setErrors(body.fields ?? {});
        setFormError(body.error ?? d.auth.login.failed);
        setPin('');
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
      {formError && <Alert tone="danger">{formError}</Alert>}

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

      <Field label={d.auth.pinLabel} htmlFor="pin" error={errors.pin} required>
        <PinInput
          id="pin"
          name="pin"
          masked
          value={pin}
          onChange={setPin}
          {...fieldAria('pin', errors.pin)}
        />
      </Field>

      <div className="flex justify-end pt-0.5">
        <Link href={forgotHref} className="text-xs font-medium text-brand underline underline-offset-2">
          {d.auth.login.forgotPin}
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
