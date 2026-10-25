'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Button, Card, CardBody, CardHeader, CardTitle, Field, Input, Modal } from '@/components/ui';
import { ChangePinForm } from '@/components/account/change-pin-form';
import { format, useI18n } from '@/components/i18n-provider';
import type { PublicUser } from '@/lib/types';
import { useToastMessage } from '@/lib/use-toast-message';

/** Shown next to a verified email or phone — the confirmation itself, with no
 * pill around it. Absence of the icon already says "not yet" once the resend
 * or change action sits right there. */
function ConfirmedIcon({ label }: { label: string }) {
  return (
    <span title={label} className="inline-flex shrink-0 text-brand-strong">
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <circle cx="12" cy="12" r="9" className="fill-brand-soft stroke-none" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m8 12.3 2.6 2.6L16 9.4" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Revealed on hover for a mouse; always on for touch, since there is no hover
 * to reveal it with. */
const EDIT_TRIGGER_CLASS =
  'rounded-md p-1 text-muted opacity-100 transition hover:bg-surface-muted hover:text-foreground ' +
  'focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100';

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

export interface EbarimtVerificationResult {
  valid: boolean;
  type?: 'CITIZEN_PHONE' | 'CITIZEN_CODE' | 'ORGANIZATION';
  name?: string;
  tin?: string;
  message: string;
}

interface ProfileResponse {
  user?: PublicUser;
  ebarimtVerification?: EbarimtVerificationResult;
  error?: string;
  fields?: Record<string, string>;
}

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

interface ProfileFormProps {
  user: PublicUser;
}

function describedBy(id: string, error: string | undefined, hasHint: boolean): string | undefined {
  if (error) return `${id}-error`;
  return hasHint ? `${id}-hint` : undefined;
}

/** A verification code or token only ever shown because message delivery is not
 * configured in this environment — never a real one a driver received. */
function DevValue({ label, value, caveat }: { label: string; value: string; caveat: string }) {
  return (
    <div className="rounded-xl bg-surface-muted px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 break-all font-mono text-sm text-foreground">{value}</p>
      <p className="mt-2 text-xs text-muted">{caveat}</p>
    </div>
  );
}

const SHOW_EBARIMT_SECTION = false; // Temporarily hidden from user profile

export function ProfileForm({ user }: ProfileFormProps) {
  const { d } = useI18n();
  const [account, setAccount] = useState(user);

  const [name, setName] = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [vehicleBrand, setVehicleBrand] = useState(user.vehicleBrand ?? '');
  const [vehicleModel, setVehicleModel] = useState(user.vehicleModel ?? '');
  const [ebarimtCustomerNo, setEbarimtCustomerNo] = useState(user.ebarimtCustomerNo ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});

  const [editingEmail, setEditingEmail] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  // Resending the current email's confirmation link — separate from editing
  // the address itself, which the field below does directly.
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNotice, setEmailNotice] = useState('');
  const [emailDevToken, setEmailDevToken] = useState('');

  // Changing the phone number: it is the sign-in identity, so a new one only
  // takes effect once the SMS code for it is verified.
  const [changingPhone, setChangingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [destination, setDestination] = useState('');
  const [devCode, setDevCode] = useState('');
  const [code, setCode] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [phoneNotice, setPhoneNotice] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneFields, setPhoneFields] = useState<Record<string, string>>({});
  // Every outcome is announced as a toast rather than a banner in the form.
  useToastMessage(error, 'error');
  useToastMessage(saved ? d.account.profile.savedLabel : '', 'success');
  useToastMessage(emailNotice, 'success');
  useToastMessage(phoneNotice, 'success');
  useToastMessage(phoneError, 'error');

  const [ebarimtStatus, setEbarimtStatus] = useState<{
    checking?: boolean;
    valid?: boolean;
    type?: 'CITIZEN_PHONE' | 'CITIZEN_CODE' | 'ORGANIZATION';
    name?: string;
    tin?: string;
    message?: string;
  }>({});

  const displayPhone = (account.phone ?? '').replace(/^\+976(\d{4})(\d{4})$/, '+976 $1 $2');

  /** Any edit invalidates the previous confirmation so it never lies about the current values. */
  function touched() {
    setSaved(false);
    setError('');
  }

  async function checkEbarimtCode(codeToCheck?: string) {
    const target = (codeToCheck ?? ebarimtCustomerNo).trim();
    if (!target) {
      setEbarimtStatus({});
      return;
    }
    setEbarimtStatus({ checking: true });
    try {
      const res = await fetch('/app-api/account/ebarimt/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: target }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        result?: EbarimtVerificationResult;
        error?: string;
      };
      if (res.ok && data.result) {
        setEbarimtStatus(data.result);
        if (!data.result.valid) {
          setFields((prev) => ({ ...prev, ebarimtCustomerNo: data.result!.message }));
        } else {
          setFields((prev) => {
            const next = { ...prev };
            delete next.ebarimtCustomerNo;
            return next;
          });
        }
      } else {
        setEbarimtStatus({ valid: false, message: data.error || 'Шалгахад алдаа гарлаа' });
      }
    } catch {
      setEbarimtStatus({ valid: false, message: 'Сүлжээний холболт амжилтгүй боллоо' });
    }
  }

  useEffect(() => {
    if (SHOW_EBARIMT_SECTION && account.ebarimtCustomerNo?.trim()) {
      checkEbarimtCode(account.ebarimtCustomerNo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');
    setFields({});

    const trimmedEbarimt = SHOW_EBARIMT_SECTION ? ebarimtCustomerNo.trim() : '';
    if (trimmedEbarimt) {
      if (!/^\d{7,12}$/.test(trimmedEbarimt)) {
        setFields({
          ebarimtCustomerNo: 'И-Баримтын хэрэглэгчийн код 8 оронтой тоо (эсвэл байгууллагын ТТД/Регистр) байх ёстой.',
        });
        setSaving(false);
        return;
      }
      const bogusCodes = [
        '00000000',
        '11111111',
        '22222222',
        '33333333',
        '44444444',
        '55555555',
        '66666666',
        '77777777',
        '88888888',
        '99999999',
        '12345678',
        '87654321',
      ];
      if (bogusCodes.includes(trimmedEbarimt)) {
        setFields({
          ebarimtCustomerNo: 'Хүчингүй код байна. Өөрийн Ebarimt систем дэх бодит 8 оронтой кодоо оруулна уу.',
        });
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch('/app-api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          vehicleBrand: vehicleBrand.trim(),
          vehicleModel: vehicleModel.trim(),
          ...(SHOW_EBARIMT_SECTION ? { ebarimtCustomerNo: ebarimtCustomerNo.trim() } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ProfileResponse;

      if (!res.ok || !data.user) {
        setError(data.error ?? d.account.profile.saveFailed);
        setFields(data.fields ?? {});
        if (data.fields?.ebarimtCustomerNo) {
          setEbarimtStatus({ valid: false, message: data.fields.ebarimtCustomerNo });
        }
        return;
      }

      setAccount(data.user);
      setName(data.user.name ?? '');
      setEmail(data.user.email ?? '');
      setVehicleBrand(data.user.vehicleBrand ?? '');
      setVehicleModel(data.user.vehicleModel ?? '');
      setEbarimtCustomerNo(data.user.ebarimtCustomerNo ?? '');
      if (data.ebarimtVerification) {
        setEbarimtStatus(data.ebarimtVerification);
      }
      setSaved(true);
      setEditingEmail(false);
    } catch {
      setError(d.account.profile.networkError);
    } finally {
      setSaving(false);
    }
  }

  async function resendEmail() {
    setEmailBusy(true);
    setEmailNotice('');
    setEmailDevToken('');

    try {
      const res = await fetch('/app-api/auth/resend-verification', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as ResendResponse;

      if (!res.ok || !data.ok) {
        setError(data.error ?? d.account.verification.emailSendFailed);
        return;
      }

      const dest = data.destination ?? account.email ?? '';
      setEmailNotice(d.auth.verify.resentTo.replace('{destination}', dest));
      if (data.devToken) setEmailDevToken(data.devToken);
    } catch {
      setError(d.account.verification.networkError);
    } finally {
      setEmailBusy(false);
    }
  }

  function startChangingPhone() {
    setNewPhone('');
    setCodeSent(false);
    setCode('');
    setPhoneError('');
    setPhoneNotice('');
    setChangingPhone(true);
  }

  async function sendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSendingCode(true);
    setPhoneNotice('');
    setPhoneError('');
    setPhoneFields({});
    setDevCode('');

    try {
      const res = await fetch('/app-api/auth/phone/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as SendCodeResponse;

      if (!res.ok || !data.ok) {
        setPhoneError(data.error ?? d.account.verification.codeSendFailed);
        setPhoneFields(data.fields ?? {});
        return;
      }

      setCodeSent(true);
      setCode('');
      setDestination(data.destination ?? newPhone.trim());
      if (data.devCode) setDevCode(data.devCode);
    } catch {
      setPhoneError(d.account.verification.networkError);
    } finally {
      setSendingCode(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyingCode(true);
    setPhoneNotice('');
    setPhoneError('');
    setPhoneFields({});

    try {
      const res = await fetch('/app-api/auth/phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as VerifyPhoneResponse;

      if (!res.ok || !data.user) {
        setPhoneError(data.error ?? d.account.verification.codeWrong);
        setPhoneFields(data.fields ?? {});
        return;
      }

      setAccount(data.user);
      setChangingPhone(false);
      setCodeSent(false);
      setCode('');
      setDevCode('');
      setPhoneNotice(d.account.verification.phoneVerified);
    } catch {
      setPhoneError(d.account.verification.networkError);
    } finally {
      setVerifyingCode(false);
    }
  }

  const dirty =
    name.trim() !== (user.name ?? '') ||
    email.trim() !== (account.email ?? '') ||
    vehicleBrand.trim() !== (user.vehicleBrand ?? '') ||
    vehicleModel.trim() !== (user.vehicleModel ?? '') ||
    (SHOW_EBARIMT_SECTION && ebarimtCustomerNo.trim() !== (account.ebarimtCustomerNo ?? ''));

  return (
    <>
      <Card>
      <CardHeader>
        <CardTitle>{d.account.profile.title}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-6">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.account.profile.nameLabel} htmlFor="profile-name" error={fields.name}>
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

            {/* Email: a static line until the pencil is asked for, so reading
                the page doesn't look like everything on it is up for editing. */}
            <div className="group space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <label htmlFor="profile-email" className="text-sm font-medium text-foreground">
                    {d.account.emailLabel}
                  </label>
                  {account.email && account.emailVerified && <ConfirmedIcon label={d.account.verified} />}
                </span>
                {!editingEmail && (
                  <button
                    type="button"
                    onClick={() => setEditingEmail(true)}
                    className={EDIT_TRIGGER_CLASS}
                    aria-label={d.common.edit}
                  >
                    <EditIcon />
                  </button>
                )}
              </div>

              {editingEmail ? (
                <Input
                  id="profile-email"
                  name="email"
                  type="email"
                  value={email}
                  autoFocus
                  autoComplete="email"
                  maxLength={200}
                  className="scroll-mt-24"
                  aria-invalid={fields.email ? true : undefined}
                  aria-describedby={describedBy('profile-email', fields.email, false)}
                  onChange={(event) => {
                    touched();
                    setEmail(event.target.value);
                  }}
                />
              ) : (
                <p
                  id="profile-email"
                  className="scroll-mt-24 truncate rounded-xl bg-surface px-3.5 py-2.5 text-sm text-foreground ring-1 ring-border"
                >
                  {account.email || d.account.noEmailYet}
                </p>
              )}
              {fields.email && <p className="text-sm text-danger">{fields.email}</p>}

              {account.email && !account.emailVerified && email.trim() === account.email && (
                <div className="space-y-2 pt-0.5">
                  {emailDevToken && (
                    <DevValue
                      label={d.account.verification.verificationToken}
                      value={emailDevToken}
                      caveat={d.account.verification.devCaveat}
                    />
                  )}
                  <Button type="button" variant="secondary" size="sm" loading={emailBusy} onClick={resendEmail}>
                    {d.account.verification.resendEmail}
                  </Button>
                </div>
              )}
            </div>

            {/* Phone: it's the sign-in identity, so changing it goes through the
                same SMS proof a new number always needs — shown inline, only
                once asked for. */}
            <div className="group space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <label htmlFor="profile-phone" className="text-sm font-medium text-foreground">
                    {d.account.mobileLabel}
                  </label>
                  {account.phone && account.phoneVerified && <ConfirmedIcon label={d.account.verified} />}
                </span>
                {!changingPhone && (
                  <button
                    type="button"
                    onClick={startChangingPhone}
                    className={EDIT_TRIGGER_CLASS}
                    aria-label={d.common.edit}
                  >
                    <EditIcon />
                  </button>
                )}
              </div>

              {!changingPhone ? (
                <p
                  id="profile-phone"
                  className="rounded-xl bg-surface px-3.5 py-2.5 text-sm text-foreground ring-1 ring-border"
                >
                  {displayPhone || d.account.noNumberYet}
                </p>
              ) : (
                <div className="max-w-sm space-y-3 rounded-xl border border-border bg-surface-muted/50 p-3.5">

                  <form onSubmit={sendCode} noValidate className="space-y-3">
                    <Field
                      label={d.account.verification.phoneTitle}
                      htmlFor="verify-phone"
                      hint={d.account.verification.phoneHint}
                      error={phoneFields.phone}
                    >
                      <Input
                        id="verify-phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder={d.account.profile.phonePlaceholder}
                        value={newPhone}
                        aria-invalid={phoneFields.phone ? true : undefined}
                        onChange={(event) => {
                          setPhoneError('');
                          setNewPhone(event.target.value);
                        }}
                      />
                    </Field>
                    <div className="flex items-center gap-2">
                      <Button type="submit" size="sm" loading={sendingCode} disabled={!newPhone.trim()}>
                        {codeSent ? d.account.verification.sendNewCode : d.account.verification.sendCode}
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => setChangingPhone(false)}>
                        {d.common.cancel}
                      </Button>
                    </div>
                  </form>

                  {devCode && (
                    <DevValue
                      label={d.account.verification.verificationCode}
                      value={devCode}
                      caveat={d.account.verification.devCaveat}
                    />
                  )}

                  {codeSent && (
                    <form onSubmit={verifyCode} noValidate className="space-y-3 border-t border-border pt-3">
                      <Field
                        label={d.account.verification.codeLabel}
                        htmlFor="verify-code"
                        hint={destination ? format(d.account.verification.codeSentTo, { destination }) : undefined}
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
                          className="max-w-36 text-center font-mono text-lg tracking-[0.35em]"
                          aria-invalid={phoneFields.code ? true : undefined}
                          onChange={(event) => {
                            setPhoneError('');
                            setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                          }}
                        />
                      </Field>
                      <Button type="submit" size="sm" loading={verifyingCode} disabled={code.length !== 6}>
                        {d.account.verifyNumber}
                      </Button>
                    </form>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">{d.account.pin.title}</label>
              <button
                type="button"
                onClick={() => setPinModalOpen(true)}
                className="flex w-full items-center justify-between rounded-xl bg-surface px-3.5 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition hover:bg-surface-muted"
              >
                {d.account.pin.submitButton}
                <svg viewBox="0 0 24 24" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Full width while the E-Barimt column is hidden, so Марк and
                  Загвар line up under the two columns of fields above. */}
              <div className={SHOW_EBARIMT_SECTION ? undefined : 'sm:col-span-2'}>
                <p className="text-sm font-semibold text-foreground">{d.account.profile.vehicleTitle}</p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <Field label={d.account.profile.vehicleBrandLabel} htmlFor="profile-vehicle-brand">
                    <Input
                      id="profile-vehicle-brand"
                      name="vehicleBrand"
                      value={vehicleBrand}
                      maxLength={40}
                      placeholder={d.account.profile.vehicleBrandPlaceholder}
                      onChange={(event) => {
                        touched();
                        setVehicleBrand(event.target.value);
                      }}
                    />
                  </Field>

                  <Field label={d.account.profile.vehicleModelLabel} htmlFor="profile-vehicle-model">
                    <Input
                      id="profile-vehicle-model"
                      name="vehicleModel"
                      value={vehicleModel}
                      maxLength={40}
                      placeholder={d.account.profile.vehicleModelPlaceholder}
                      onChange={(event) => {
                        touched();
                        setVehicleModel(event.target.value);
                      }}
                    />
                  </Field>
                </div>
              </div>

              {SHOW_EBARIMT_SECTION && (
                <div>
                  <p className="text-sm font-semibold text-foreground">{d.account.profile.ebarimtTitle}</p>
                <p className="mt-1 text-xs text-muted">{d.account.profile.ebarimtHint}</p>
                <div className="mt-3 space-y-2.5">
              <div className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    id="profile-ebarimt-customer-no"
                    name="ebarimtCustomerNo"
                    value={ebarimtCustomerNo}
                    maxLength={12}
                    placeholder={d.account.profile.ebarimtCustomerNoPlaceholder}
                    aria-invalid={fields.ebarimtCustomerNo ? true : undefined}
                    aria-describedby={describedBy('profile-ebarimt-customer-no', fields.ebarimtCustomerNo, false)}
                    onChange={(event) => {
                      touched();
                      setEbarimtStatus({});
                      setFields((prev) => {
                        const next = { ...prev };
                        delete next.ebarimtCustomerNo;
                        return next;
                      });
                      setEbarimtCustomerNo(event.target.value.replace(/\D/g, ''));
                    }}
                    onBlur={() => {
                      if (ebarimtCustomerNo.trim() && !ebarimtStatus.valid) {
                        checkEbarimtCode();
                      }
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  loading={ebarimtStatus.checking}
                  disabled={!ebarimtCustomerNo.trim() || ebarimtStatus.checking}
                  onClick={() => checkEbarimtCode()}
                >
                  Шалгах
                </Button>
              </div>

              {fields.ebarimtCustomerNo && (
                <p className="text-xs font-medium text-danger">{fields.ebarimtCustomerNo}</p>
              )}

              {ebarimtStatus.checking && (
                <div className="flex items-center gap-2 text-xs text-muted animate-pulse">
                  <svg className="size-3.5 animate-spin text-brand" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Татварын системээс шалгаж байна...</span>
                </div>
              )}

              {!ebarimtStatus.checking && ebarimtStatus.valid && ebarimtStatus.message && (
                <div className="flex items-start gap-2 rounded-lg bg-brand/10 p-2.5 text-xs font-medium text-brand-strong border border-brand/20">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  <div className="space-y-0.5">
                    {ebarimtStatus.type === 'ORGANIZATION' && (
                      <p className="font-semibold text-foreground">🏢 {ebarimtStatus.name}</p>
                    )}
                    <p>{ebarimtStatus.message}</p>
                  </div>
                </div>
              )}

              {!ebarimtStatus.checking && ebarimtStatus.valid === false && ebarimtStatus.message && (
                <div className="flex items-start gap-2 rounded-lg bg-danger/10 p-2.5 text-xs font-medium text-danger border border-danger/20">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <span>{ebarimtStatus.message}</span>
                </div>
              )}

              {(() => {
                const phone8 = (account.phone || '').replace(/\D/g, '').slice(-8);
                if (phone8.length === 8 && ebarimtCustomerNo !== phone8) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        touched();
                        setEbarimtCustomerNo(phone8);
                        checkEbarimtCode(phone8);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                    >
                      <span>💡 Баталгаажсан дугаараа ашиглах:</span>
                      <span className="font-semibold">{phone8}</span>
                    </button>
                  );
                }
                return null;
              })()}
                </div>
              </div>
              )}
            </div>
          </div>

          {(dirty || saving || saved) && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              <p aria-live="polite" className="text-sm font-medium text-brand-strong">
                {saved ? d.account.profile.savedLabel : ''}
              </p>
              <Button type="submit" loading={saving} disabled={!dirty && !saving}>
                {d.account.profile.saveButton}
              </Button>
            </div>
          )}
        </form>
      </CardBody>
      </Card>

      {pinModalOpen && (
        <Modal onClose={() => setPinModalOpen(false)} maxWidth="sm">
          <ChangePinForm hasPin={account.hasPin} onClose={() => setPinModalOpen(false)} />
        </Modal>
      )}
    </>
  );
}
