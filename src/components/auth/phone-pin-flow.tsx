'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Alert, Button, Field } from '@/components/ui';
import { format, useI18n } from '@/components/i18n-provider';
import { cn } from '@/lib/utils';
import { phoneSchema } from '@/lib/validation';
import { fieldAria, sanitizeNext } from './auth-shell';
import { DevHint } from './dev-hint';
import { PhoneInput } from './phone-input';
import { PinInput } from './pin-input';

type Mode = 'signup' | 'reset';
type Step = 'phone' | 'code' | 'pin';

const ENDPOINTS = {
  signup: {
    send: '/app-api/auth/signup/send-code',
    verify: '/app-api/auth/signup/verify',
    finish: '/app-api/auth/signup/complete',
    ticket: 'signupTicket',
  },
  reset: {
    send: '/app-api/auth/pin/forgot',
    verify: '/app-api/auth/pin/verify',
    finish: '/app-api/auth/pin/reset',
    ticket: 'resetTicket',
  },
} as const;

/** How long "send a new code" stays disabled after a code goes out. */
const RESEND_SECONDS = 60;

interface ApiBody {
  error?: string;
  fields?: Record<string, string>;
  destination?: string;
  devCode?: string;
  signupTicket?: string;
  resetTicket?: string;
}

/** The API masks the number as "********8844"; it reads better as "•••• 8844". */
function prettyDestination(masked: string): string {
  const digits = masked.replace(/\D/g, '');
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : masked;
}

async function post(url: string, payload: unknown): Promise<{ ok: boolean; body: ApiBody }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { ok: res.ok, body: (await res.json().catch(() => ({}))) as ApiBody };
}

/**
 * Phone number → SMS code → 4-digit PIN typed twice. Sign-up creates the
 * account at the end; a reset replaces the PIN. Both sign the driver in.
 */
export function PhonePinFlow({ mode }: { mode: Mode }) {
  const { d } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const next = sanitizeNext(params.get('next'));
  const api = ENDPOINTS[mode];
  const copy = mode === 'signup' ? d.auth.register : d.auth.forgot;

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(params.get('phone') ?? '');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [destination, setDestination] = useState('');
  const [devCode, setDevCode] = useState<string>();
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const confirmRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  function restart(message?: string) {
    setStep('phone');
    setCode('');
    setTicket('');
    setPin('');
    setConfirmPin('');
    setDevCode(undefined);
    setErrors({});
    setFormError(message ?? null);
  }

  function fail(body: ApiBody) {
    // The verified-phone ticket ran out: only starting over can fix that.
    if (body.fields?.ticket) return restart(body.error);
    setErrors(body.fields ?? {});
    setFormError(body.error ?? copy.failed);
  }

  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    setErrors({});
    setFormError(null);
    try {
      await action();
    } catch {
      setFormError(d.auth.networkError);
    } finally {
      setPending(false);
    }
  }

  async function sendCode() {
    const parsed = phoneSchema.safeParse(phone);
    const local: Record<string, string> = {};
    if (!parsed.success) local.phone = parsed.error.issues[0]?.message ?? d.auth.checkFields;
    if (mode === 'signup' && !acceptTerms) local.acceptTerms = d.auth.register.mustAccept;
    if (Object.keys(local).length > 0) {
      setErrors(local);
      setFormError(d.auth.checkFields);
      return;
    }

    await run(async () => {
      const { ok, body } = await post(api.send, mode === 'signup' ? { phone, acceptTerms } : { phone });
      if (!ok) return fail(body);
      setDestination(prettyDestination(body.destination ?? phone));
      setDevCode(body.devCode);
      setCode('');
      setResendIn(RESEND_SECONDS);
      setStep('code');
    });
  }

  async function verifyCode(value = code) {
    if (!/^\d{6}$/.test(value)) {
      setErrors({ code: d.auth.codeInvalid });
      return;
    }

    await run(async () => {
      const { ok, body } = await post(api.verify, { phone, code: value });
      if (!ok) {
        setCode('');
        return fail(body);
      }
      const issued = mode === 'signup' ? body.signupTicket : body.resetTicket;
      if (!issued) {
        setFormError(copy.failed);
        return;
      }
      setTicket(issued);
      setDevCode(undefined);
      setStep('pin');
    });
  }

  async function finish() {
    if (!/^\d{4}$/.test(pin)) {
      setErrors({ pin: d.auth.pinHint });
      return;
    }
    if (pin !== confirmPin) {
      setErrors({ confirmPin: d.auth.pinMismatch });
      setConfirmPin('');
      confirmRef.current?.focus();
      return;
    }

    await run(async () => {
      const { ok, body } = await post(api.finish, { [api.ticket]: ticket, pin, confirmPin });
      if (!ok) return fail(body);
      router.replace(next);
      router.refresh();
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 'phone') void sendCode();
    else if (step === 'code') void verifyCode();
    else void finish();
  }

  const stepNumber = step === 'phone' ? 1 : step === 'code' ? 2 : 3;
  const title = step === 'phone' ? copy.phoneTitle : step === 'code' ? copy.codeTitle : copy.pinTitle;
  const submitLabel =
    step === 'phone' ? d.auth.continue : step === 'code' ? d.auth.verifyCode : copy.submit;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 key={step} className="auth-step text-base font-semibold text-foreground">
            {title}
          </h2>
          <span className="shrink-0 text-sm text-muted tabular-nums">
            {format(d.auth.stepOf, { step: stepNumber })}
          </span>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-500',
                n <= stepNumber ? 'bg-brand' : 'bg-border',
              )}
            />
          ))}
        </div>
      </div>

      {formError && <Alert tone="danger">{formError}</Alert>}

      {/* Keyed by step so each new step slides in. */}
      <div key={step} className="auth-step space-y-5">
      {step === 'phone' && (
        <>
          <Field
            label={d.auth.phoneLabel}
            htmlFor="phone"
            error={errors.phone}
            hint={d.auth.phoneHint}
          >
            <PhoneInput
              id="phone"
              name="phone"
              autoComplete="tel"
              autoFocus
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={d.auth.phonePlaceholder}
              {...fieldAria('phone', errors.phone, true)}
            />
          </Field>

          {mode === 'signup' && (
            <div className="space-y-1">
              <label
                htmlFor="acceptTerms"
                className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm text-foreground"
              >
                <input
                  id="acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) => setAcceptTerms(event.target.checked)}
                  className="size-4 shrink-0 rounded accent-brand"
                  {...fieldAria('acceptTerms', errors.acceptTerms)}
                />
                <span>
                  {d.auth.register.agreePrefix}
                  <Link href="/legal/terms" className="font-medium text-brand underline underline-offset-2">
                    {d.auth.register.termsLink}
                  </Link>
                  {d.auth.register.agreeMiddle}
                  <Link href="/legal/privacy" className="font-medium text-brand underline underline-offset-2">
                    {d.auth.register.privacyLink}
                  </Link>
                  {d.auth.register.agreeSuffix}
                </span>
              </label>
              {errors.acceptTerms && (
                <p id="acceptTerms-error" className="text-xs text-danger">
                  {errors.acceptTerms}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {step === 'code' && (
        <>
          <p className="text-sm text-muted">{format(d.auth.codeSentTo, { destination })}</p>

          <Field label={d.auth.codeLabel} htmlFor="code" error={errors.code} className="text-center">
            <PinInput
              id="code"
              name="code"
              length={6}
              autoFocus
              autoComplete="one-time-code"
              value={code}
              disabled={pending}
              onChange={(value) => {
                setCode(value);
                if (value.length === 6) void verifyCode(value);
              }}
              {...fieldAria('code', errors.code)}
            />
          </Field>

          <DevHint code={devCode} />

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => restart()}
              className="font-medium text-brand underline underline-offset-2"
            >
              {d.auth.changeNumber}
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || pending}
              onClick={() => void sendCode()}
              className="font-medium text-brand underline underline-offset-2 disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
            >
              {resendIn > 0 ? format(d.auth.resendIn, { seconds: resendIn }) : d.auth.resendCode}
            </button>
          </div>
        </>
      )}

      {step === 'pin' && (
        <>
          <p className="text-sm text-muted">{copy.pinBody}</p>

          <Field label={d.auth.newPinLabel} htmlFor="pin" error={errors.pin} className="text-center">
            <PinInput
              id="pin"
              name="pin"
              masked
              autoFocus
              value={pin}
              onChange={(value) => {
                setPin(value);
                setConfirmPin('');
                setErrors({});
                if (value.length === 4) confirmRef.current?.focus();
              }}
              {...fieldAria('pin', errors.pin)}
            />
          </Field>

          <Field
            label={d.auth.confirmPinLabel}
            htmlFor="confirmPin"
            error={errors.confirmPin}
            className="text-center"
          >
            <PinInput
              ref={confirmRef}
              id="confirmPin"
              name="confirmPin"
              masked
              value={confirmPin}
              onChange={(value) => {
                if (value.length === 4 && value !== pin) {
                  setConfirmPin('');
                  setErrors({ confirmPin: d.auth.pinMismatch });
                  return;
                }
                setConfirmPin(value);
                setErrors({});
              }}
              {...fieldAria('confirmPin', errors.confirmPin)}
            />
          </Field>
        </>
      )}
      </div>

      <Button type="submit" size="pill" loading={pending} className="w-full">
        {submitLabel}
      </Button>

      {mode === 'reset' && (
        <p className="text-center text-sm">
          <Link href="/login" className="font-medium text-brand underline-offset-4 hover:underline">
            {d.auth.forgot.backToSignIn}
          </Link>
        </p>
      )}
    </form>
  );
}
