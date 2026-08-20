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

interface PasswordResponse {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string>;
}

export function ChangePasswordForm() {
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
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as PasswordResponse;

      if (!res.ok || !data.ok) {
        setError(data.error ?? 'Could not change your password. Please try again.');
        setFields(data.fields ?? {});
        return;
      }

      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
      setDone(true);
      router.refresh();
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <p className="text-sm text-muted">
            Changing your password signs out every other device that is still using this account.
          </p>

          {done && <Alert tone="success">Your password has been changed. Other devices are now signed out.</Alert>}
          {error && <Alert tone="danger">{error}</Alert>}

          <Field label="Current password" htmlFor="current-password" required error={fields.currentPassword}>
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
            label="New password"
            htmlFor="new-password"
            required
            hint="At least 8 characters, including a letter and a number."
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
            label="Confirm new password"
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
