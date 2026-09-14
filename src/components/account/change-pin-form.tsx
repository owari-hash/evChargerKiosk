'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Alert, Button, Card } from '@/components/ui';
import { useI18n } from '@/components/i18n-provider';
import { PinInput } from '@/components/auth/pin-input';
import { cn } from '@/lib/utils';

type Stage = 'current' | 'new' | 'confirm' | 'done';

interface PinResponse {
  ok?: boolean;
  error?: string;
  fields?: Record<string, string>;
}

/** Lets the fourth digit's pop land before the next step slides in. */
const ADVANCE_DELAY_MS = 180;

/**
 * Changes the sign-in PIN one step at a time: the current PIN, the new one, the
 * new one again. Each step moves on by itself when the fourth digit goes in.
 * An account that has never had a PIN starts at the new one.
 */
export function ChangePinForm({ hasPin }: { hasPin: boolean }) {
  const { d } = useI18n();
  const router = useRouter();
  const stages: Stage[] = hasPin ? ['current', 'new', 'confirm'] : ['new', 'confirm'];

  const [stage, setStage] = useState<Stage>(stages[0]);
  const [currentPin, setCurrentPin] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const t = d.account.pin;
  const index = stage === 'done' ? stages.length : stages.indexOf(stage);

  const value = stage === 'current' ? currentPin : stage === 'new' ? pin : confirmPin;
  const copy = {
    current: { label: t.currentLabel, body: t.currentBody },
    new: { label: t.newLabel, body: t.newBody },
    confirm: { label: t.confirmLabel, body: t.confirmBody },
    done: { label: '', body: '' },
  }[stage];

  function restart() {
    setCurrentPin('');
    setPin('');
    setConfirmPin('');
    setFieldError('');
    setFormError('');
    setStage(stages[0]);
  }

  function goBack() {
    setFieldError('');
    setFormError('');
    if (stage === 'confirm') {
      setConfirmPin('');
      setPin('');
      setStage('new');
    } else if (stage === 'new' && hasPin) {
      setPin('');
      setCurrentPin('');
      setStage('current');
    }
  }

  async function save(repeat: string) {
    if (repeat !== pin) {
      setConfirmPin('');
      setFieldError(d.auth.pinMismatch);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/app-api/account/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: hasPin ? currentPin : undefined, pin, confirmPin: repeat }),
      });
      const data = (await res.json().catch(() => ({}))) as PinResponse;

      if (!res.ok || !data.ok) {
        // A wrong current PIN is only fixable on the first step.
        if (data.fields?.currentPin) {
          setCurrentPin('');
          setPin('');
          setConfirmPin('');
          setStage('current');
          setFieldError(data.fields.currentPin);
        } else {
          setConfirmPin('');
          setFormError(data.error ?? t.failed);
        }
        return;
      }

      setStage('done');
      router.refresh();
    } catch {
      setFormError(d.account.profile.networkError);
    } finally {
      setSaving(false);
    }
  }

  function onChange(next: string) {
    setFieldError('');
    setFormError('');

    if (stage === 'current') setCurrentPin(next);
    if (stage === 'new') setPin(next);
    if (stage === 'confirm') setConfirmPin(next);
    if (next.length < 4) return;

    if (stage === 'current') setTimeout(() => setStage('new'), ADVANCE_DELAY_MS);
    if (stage === 'new') setTimeout(() => setStage('confirm'), ADVANCE_DELAY_MS);
    if (stage === 'confirm') setTimeout(() => void save(next), ADVANCE_DELAY_MS);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.length !== 4 || saving) return;
    if (stage === 'current') setStage('new');
    else if (stage === 'new') setStage('confirm');
    else if (stage === 'confirm') void save(confirmPin);
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 border-b border-border px-6 py-5 sm:px-8">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand" aria-hidden>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">{t.title}</h2>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-muted">
            {hasPin ? t.signOutHint : t.noPinYet}
          </p>
        </div>
      </div>

      <div className="px-6 py-8 sm:px-8">
        <div className="mx-auto max-w-sm">
          {stage === 'done' ? (
            <div className="auth-step text-center" role="status">
              <span className="success-pop mx-auto grid size-16 place-items-center rounded-full bg-brand text-brand-contrast">
                <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
              </span>
              <p className="mt-5 text-pretty text-base font-medium text-foreground">{t.changed}</p>
              <Button type="button" variant="secondary" size="pill" className="mt-7 w-full" onClick={restart}>
                {t.again}
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate>
              <div className="flex justify-center gap-2" aria-hidden>
                {stages.map((s, i) => (
                  <span
                    key={s}
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-500',
                      i === index ? 'w-8 bg-brand' : i < index ? 'w-4 bg-brand' : 'w-4 bg-border',
                    )}
                  />
                ))}
              </div>

              <div key={stage} className="auth-step mt-6 text-center">
                <label htmlFor="pin-step" className="block text-lg font-semibold text-foreground">
                  {copy.label}
                </label>
                <p className="mt-1 text-sm text-muted">{copy.body}</p>
                <div className="mt-6">
                  <PinInput
                    id="pin-step"
                    name={stage}
                    masked
                    autoFocus
                    value={value}
                    disabled={saving}
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={fieldError ? 'pin-step-error' : undefined}
                    onChange={onChange}
                  />
                </div>
                <p
                  id="pin-step-error"
                  className={cn('mt-3 min-h-5 text-sm text-danger', !fieldError && 'invisible')}
                >
                  {fieldError || ' '}
                </p>
              </div>

              {formError && (
                <Alert tone="danger" className="mt-2">
                  {formError}
                </Alert>
              )}

              <div className="mt-5 flex items-center gap-3">
                {index > 0 && (
                  <Button type="button" variant="secondary" size="pill" onClick={goBack} disabled={saving}>
                    {d.common.back}
                  </Button>
                )}
                <Button type="submit" size="pill" className="flex-1" loading={saving} disabled={value.length !== 4}>
                  {stage === 'confirm' ? (hasPin ? t.submitButton : t.setButton) : d.auth.continue}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Card>
  );
}
