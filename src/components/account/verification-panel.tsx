'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from '@/components/ui';
import type { PublicUser } from '@/lib/types';

const VERIFIED_TONE = 'bg-brand-soft text-brand-strong ring-brand/30';
const PENDING_TONE = 'bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-300';

const DEV_CAVEAT = 'Development mode — shown here because message delivery is not configured.';

interface ResendResponse {
  ok?: boolean;
  destination?: string;
  devToken?: string;
  error?: string;
}

interface SendCodeResponse {
  ok?: boolean;
  destination?: string;
  devCode?: string;
  error?: string;
  fields?: Record<string, string>;
}

interface VerifyPhoneResponse {
  ok?: boolean;
  user?: PublicUser;
  error?: string;
  fields?: Record<string, string>;
}

interface VerificationPanelProps {
  user: PublicUser;
}

function DevValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted">{DEV_CAVEAT}</p>
    </div>
  );
}

export function VerificationPanel({ user }: VerificationPanelProps) {
  const router = useRouter();
  const [account, setAccount] = useState(user);

  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNotice, setEmailNotice] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailDevToken, setEmailDevToken] = useState('');

  const [phone, setPhone] = useState(user.phone ?? '');
  const [sending, setSending] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [destination, setDestination] = useState('');
  const [devCode, setDevCode] = useState('');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [phoneNotice, setPhoneNotice] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneFields, setPhoneFields] = useState<Record<string, string>>({});

  async function resendEmail() {
    setEmailBusy(true);
    setEmailNotice('');
    setEmailError('');
    setEmailDevToken('');

    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as ResendResponse;

      if (!res.ok || !data.ok) {
        setEmailError(data.error ?? 'Could not send the verification email. Please try again.');
        return;
      }

      setEmailNotice(
        `A new confirmation link is on its way to ${data.destination ?? account.email}. It is valid for 24 hours.`,
      );
      if (data.devToken) setEmailDevToken(data.devToken);
    } catch {
      setEmailError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setEmailBusy(false);
    }
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setPhoneNotice('');
    setPhoneError('');
    setPhoneFields({});
    setDevCode('');

    try {
      const res = await fetch('/api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as SendCodeResponse;

      if (!res.ok || !data.ok) {
        setPhoneError(data.error ?? 'Could not send the code. Please try again.');
        setPhoneFields(data.fields ?? {});
        return;
      }

      setCodeSent(true);
      setCode('');
      setDestination(data.destination ?? phone.trim());
      if (data.devCode) setDevCode(data.devCode);
    } catch {
      setPhoneError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifying(true);
    setPhoneNotice('');
    setPhoneError('');
    setPhoneFields({});

    try {
      const res = await fetch('/api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as VerifyPhoneResponse;

      if (!res.ok || !data.user) {
        setPhoneError(data.error ?? 'That code did not work. Please try again.');
        setPhoneFields(data.fields ?? {});
        return;
      }

      setAccount(data.user);
      setPhone(data.user.phone ?? phone);
      setCodeSent(false);
      setCode('');
      setDevCode('');
      setPhoneNotice('Your mobile number is verified.');
      router.refresh();
    } catch {
      setPhoneError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <>
      <Card id="email" className="scroll-mt-24">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Email address</CardTitle>
          <Badge tone={account.emailVerified ? VERIFIED_TONE : PENDING_TONE}>
            {account.emailVerified ? 'Verified' : 'Not verified'}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted">
            {account.emailVerified
              ? `${account.email} is confirmed. We use it for charging receipts and account notices.`
              : `Confirm ${account.email} so we can send charging receipts and account notices. The link we email is valid for 24 hours.`}
          </p>

          {emailNotice && <Alert tone="success">{emailNotice}</Alert>}
          {emailError && <Alert tone="danger">{emailError}</Alert>}
          {emailDevToken && <DevValue label="Verification token" value={emailDevToken} />}

          {!account.emailVerified && (
            <Button variant="secondary" loading={emailBusy} onClick={resendEmail}>
              Resend verification email
            </Button>
          )}
        </CardBody>
      </Card>

      <Card id="phone" className="scroll-mt-24">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Phone number</CardTitle>
          <Badge tone={account.phoneVerified ? VERIFIED_TONE : PENDING_TONE}>
            {account.phoneVerified ? 'Verified' : 'Not verified'}
          </Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          {phoneNotice && <Alert tone="success">{phoneNotice}</Alert>}
          {phoneError && <Alert tone="danger">{phoneError}</Alert>}

          {account.phoneVerified ? (
            <p className="text-sm text-muted">
              {account.phone} is confirmed, so we can text you about a charge that needs attention.
              To use a different number, change it on the{' '}
              <Link href="/account" className="text-brand-strong underline underline-offset-4">
                Overview
              </Link>{' '}
              tab and verify it here.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Verify a mobile number so we can text you about a charge that needs attention, and
                so you can reset your password by SMS.
              </p>

              <form onSubmit={sendCode} noValidate className="space-y-3">
                <Field
                  label="Mobile number"
                  htmlFor="verify-phone"
                  hint="Enter a different number here to verify that one instead."
                  error={phoneFields.phone}
                >
                  <Input
                    id="verify-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="+976 9911 2233"
                    value={phone}
                    aria-invalid={phoneFields.phone ? true : undefined}
                    aria-describedby={phoneFields.phone ? 'verify-phone-error' : 'verify-phone-hint'}
                    onChange={(event) => {
                      setPhoneError('');
                      setPhone(event.target.value);
                    }}
                  />
                </Field>
                <Button
                  type="submit"
                  variant="secondary"
                  loading={sending}
                  disabled={!phone.trim()}
                >
                  {codeSent ? 'Send a new code' : 'Send code'}
                </Button>
              </form>

              {devCode && <DevValue label="Verification code" value={devCode} />}

              {codeSent && (
                <form onSubmit={verifyCode} noValidate className="space-y-3 border-t border-border pt-4">
                  <Field
                    label="6-digit code"
                    htmlFor="verify-code"
                    hint={destination ? `Sent to ${destination}. It expires in 10 minutes.` : undefined}
                    error={phoneFields.code}
                  >
                    <Input
                      id="verify-code"
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={code}
                      className="max-w-44 text-center font-mono text-lg tracking-[0.35em]"
                      aria-invalid={phoneFields.code ? true : undefined}
                      aria-describedby={phoneFields.code ? 'verify-code-error' : 'verify-code-hint'}
                      onChange={(event) => {
                        setPhoneError('');
                        setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                      }}
                    />
                  </Field>
                  <Button type="submit" loading={verifying} disabled={code.length !== 6}>
                    Verify number
                  </Button>
                </form>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </>
  );
}
