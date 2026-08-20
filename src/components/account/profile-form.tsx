'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
} from '@/components/ui';
import type { PublicUser } from '@/lib/types';

type Locale = 'en' | 'mn';

interface ProfileResponse {
  user?: PublicUser;
  error?: string;
  fields?: Record<string, string>;
}

interface ProfileFormProps {
  user: PublicUser;
}

function describedBy(id: string, error: string | undefined, hasHint: boolean): string | undefined {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [locale, setLocale] = useState<Locale>(user.locale === 'mn' ? 'mn' : 'en');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  /** Any edit invalidates the previous confirmation so it never lies about the current values. */
  function touched() {
    setSaved(false);
    setError('');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    setFields({});

    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), locale }),
      });
      const data = (await res.json().catch(() => ({}))) as ProfileResponse;

      if (!res.ok || !data.user) {
        setError(data.error ?? 'Could not save your details. Please try again.');
        setFields(data.fields ?? {});
        return;
      }

      setName(data.user.name ?? '');
      setPhone(data.user.phone ?? '');
      setLocale(data.user.locale === 'mn' ? 'mn' : 'en');
      setSaved(true);
      router.refresh();
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const phoneHint = (
    <>
      A new number needs to be verified again on the{' '}
      <Link href="/account/security" className="text-brand-strong underline underline-offset-4">
        Security
      </Link>{' '}
      tab.
    </>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your details</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}

          <Field label="Name" htmlFor="profile-name" error={fields.name}>
            <Input
              id="profile-name"
              name="name"
              value={name}
              autoComplete="name"
              maxLength={80}
              aria-invalid={fields.name ? true : undefined}
              aria-describedby={describedBy('profile-name', fields.name, false)}
              onChange={(event) => {
                touched();
                setName(event.target.value);
              }}
            />
          </Field>

          <Field
            label="Mobile number"
            htmlFor="profile-phone"
            hint={phoneHint}
            error={fields.phone}
          >
            <Input
              id="profile-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              autoComplete="tel"
              placeholder="+976 9911 2233"
              aria-invalid={fields.phone ? true : undefined}
              aria-describedby={describedBy('profile-phone', fields.phone, true)}
              onChange={(event) => {
                touched();
                setPhone(event.target.value);
              }}
            />
          </Field>

          <Field
            label="Language"
            htmlFor="profile-locale"
            hint="Used for emails and text messages we send you."
            error={fields.locale}
          >
            <Select
              id="profile-locale"
              name="locale"
              value={locale}
              aria-invalid={fields.locale ? true : undefined}
              aria-describedby={describedBy('profile-locale', fields.locale, true)}
              onChange={(event) => {
                touched();
                setLocale(event.target.value === 'mn' ? 'mn' : 'en');
              }}
            >
              <option value="en">English</option>
              <option value="mn">Монгол</option>
            </Select>
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
            <p aria-live="polite" className="text-sm font-medium text-brand-strong">
              {saved ? 'Saved.' : ''}
            </p>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
