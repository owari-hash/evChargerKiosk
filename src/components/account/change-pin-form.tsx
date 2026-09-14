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
} from '@/components/ui';
import { useI18n } from '@/components/i18n-provider';
import { PinInput } from '@/components/auth/pin-input';

interface PinResponse {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string>;
}

/** Changes the sign-in PIN, or sets the first one on an older account. */
export function ChangePinForm({ hasPin }: { hasPin: boolean }) {
  const { d } = useI18n();
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  function touched() {
    setDone(false);
    setError('');
    setFields({});
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin !== confirmPin) {
      setFields({ confirmPin: d.auth.pinMismatch });
      setConfirmPin('');
      return;
    }

    setSaving(true);
    touched();

    try {
      const res = await fetch('/app-api/account/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: hasPin ? currentPin : undefined, pin, confirmPin }),
      });
      const data = (await res.json().catch(() => ({}))) as PinResponse;

      if (!res.ok || !data.ok) {
        setError(data.error ?? d.account.pin.failed);
        setFields(data.fields ?? {});
        return;
      }

      setCurrentPin('');
      setPin('');
      setConfirmPin('');
      setDone(true);
      router.refresh();
    } catch {
      setError(d.account.profile.networkError);
    } finally {
      setSaving(false);
    }
  }

  const ready = pin.length === 4 && confirmPin.length === 4 && (!hasPin || currentPin.length === 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.account.pin.title}</CardTitle>
      </CardHeader>
      <CardBody>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <p className="text-sm text-muted">
            {hasPin ? d.account.pin.signOutHint : d.account.pin.noPinYet}
          </p>

          {done && <Alert tone="success">{d.account.pin.changed}</Alert>}
          {error && <Alert tone="danger">{error}</Alert>}

          {hasPin && (
            <Field label={d.account.pin.currentLabel} htmlFor="current-pin" error={fields.currentPin}>
              <PinInput
                id="current-pin"
                name="currentPin"
                masked
                value={currentPin}
                aria-invalid={fields.currentPin ? true : undefined}
                aria-describedby={fields.currentPin ? 'current-pin-error' : undefined}
                onChange={(value) => {
                  touched();
                  setCurrentPin(value);
                }}
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.account.pin.newLabel} htmlFor="new-pin" error={fields.pin}>
              <PinInput
                id="new-pin"
                name="pin"
                masked
                value={pin}
                aria-invalid={fields.pin ? true : undefined}
                aria-describedby={fields.pin ? 'new-pin-error' : undefined}
                onChange={(value) => {
                  touched();
                  setPin(value);
                  setConfirmPin('');
                }}
              />
            </Field>

            <Field label={d.account.pin.confirmLabel} htmlFor="confirm-pin" error={fields.confirmPin}>
              <PinInput
                id="confirm-pin"
                name="confirmPin"
                masked
                value={confirmPin}
                aria-invalid={fields.confirmPin ? true : undefined}
                aria-describedby={fields.confirmPin ? 'confirm-pin-error' : undefined}
                onChange={(value) => {
                  touched();
                  if (value.length === 4 && value !== pin) {
                    setConfirmPin('');
                    setFields({ confirmPin: d.auth.pinMismatch });
                    return;
                  }
                  setConfirmPin(value);
                }}
              />
            </Field>
          </div>

          <Button type="submit" loading={saving} disabled={!ready}>
            {hasPin ? d.account.pin.submitButton : d.account.pin.setButton}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
