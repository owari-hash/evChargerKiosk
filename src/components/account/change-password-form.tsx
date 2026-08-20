'use client';

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
} from '@/components/ui';
import { useI18n } from '@/components/i18n-provider';

interface PasswordResponse {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string>;
}

export function ChangePasswordForm() {
  const { d } = useI18n();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  function touched() {
    setDone(false);
    setError('');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setDone(false);
    setError('');
    setFields({});

    try {
      const res = await fetch('/app-api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as PasswordResponse;

      if (!res.ok || !data.ok) {
        setError(data.error ?? d.account.password.failed);
        setFields(data.fields ?? {});
        return;
      }

      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setDone(true);
      router.refresh();
    } catch {
      setError(d.account.profile.networkError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.account.password.title}</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <p className="text-sm text-muted">
            Changing your password signs out every other device that is still using this account.
          </p>

          {done && <Alert tone="success">{d.account.password.changed}</Alert>}
          {error && <Alert tone="danger">{error}</Alert>}

          <Field
            label={d.account.password.currentLabel}
            htmlFor="current-password"
            required
            error={fields.currentPassword}
          >
            <Input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              required
              aria-invalid={fields.currentPassword ? true : undefined}
              aria-describedby={fields.currentPassword ? 'current-password-error' : undefined}
              onChange={(event) => {
                touched();
                setCurrentPassword(event.target.value);
              }}
            />
          </Field>

          <Field
            label={d.account.password.newLabel}
            htmlFor="new-password"
            required
            hint={d.auth.passwordHint}
            error={fields.password}
          >
            <Input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              required
              aria-invalid={fields.password ? true : undefined}
              aria-describedby={fields.password ? 'new-password-error' : 'new-password-hint'}
              onChange={(event) => {
                touched();
                setPassword(event.target.value);
              }}
            />
          </Field>

          <Field
            label={d.account.password.confirmLabel}
            htmlFor="confirm-password"
            required
            error={fields.confirmPassword}
          >
            <Input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              required
              aria-invalid={fields.confirmPassword ? true : undefined}
              aria-describedby={fields.confirmPassword ? 'confirm-password-error' : undefined}
              onChange={(event) => {
                touched();
                setConfirmPassword(event.target.value);
              }}
            />
          </Field>

          <Button type="submit" loading={saving}>
            Change password
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
