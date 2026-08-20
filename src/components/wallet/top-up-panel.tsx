'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { format, useI18n } from '@/components/i18n-provider';
import { Alert, Button, Card, CardBody, CardHeader, CardTitle, Field, Input } from '@/components/ui';
import type { TopUpInvoice, WalletConfig } from '@/lib/csms/wallet';
import { cn, formatMoney, intlLocale } from '@/lib/utils';

/**
 * QPay top-up: pick a preset or type an amount, then pay the QR.
 *
 * Payment is confirmed by polling our own API, which asks QPay and credits the
 * wallet server-side. Nothing here decides that money arrived — the screen only
 * reflects what the CSMS reports, so a driver cannot fake a paid balance.
 */

interface TopUpPanelProps {
  config: WalletConfig;
}

type Invoice = TopUpInvoice & { qrImage?: string };

/** How long to keep polling before asking the driver to confirm by hand. */
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export function TopUpPanel({ config }: TopUpPanelProps) {
  const router = useRouter();
  const { d, locale } = useI18n();
  const t = d.wallet.topUp;
  const ti = d.wallet.invoice;
  const money = (value: number) => formatMoney(value, intlLocale(locale));

  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [creating, setCreating] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [notice, setNotice] = useState('');

  const amount = selected ?? (custom.trim() ? Number(custom.replace(/\s/g, '')) : NaN);

  function validate(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return t.invalidAmount;
    if (!Number.isInteger(value)) return t.invalidAmount;
    if (value < config.minTopUp) return format(t.tooSmall, { min: money(config.minTopUp) });
    if (value > config.maxTopUp) return format(t.tooLarge, { max: money(config.maxTopUp) });
    return '';
  }

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validate(amount);
    if (problem) {
      setFieldError(problem);
      return;
    }

    setCreating(true);
    setError('');
    setFieldError('');
    setNotice('');

    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        invoice?: Invoice;
        error?: string;
        fields?: Record<string, string>;
      };

      if (!res.ok || !data.invoice) {
        setError(data.error ?? ti.failed);
        setFieldError(data.fields?.amount ?? '');
        return;
      }

      setInvoice(data.invoice);
    } catch {
      setError(d.common.networkError);
    } finally {
      setCreating(false);
    }
  }

  /** Ask the server whether QPay has settled the invoice yet. */
  const check = useCallback(
    async (id: string, manual: boolean): Promise<boolean> => {
      if (manual) {
        setChecking(true);
        setNotice('');
        setError('');
      }
      try {
        const res = await fetch(`/api/wallet/topup/${encodeURIComponent(id)}`);
        const data = (await res.json().catch(() => ({}))) as {
          invoice?: Invoice;
          paid?: boolean;
          wallet?: { balance: number } | null;
          error?: string;
        };

        if (!res.ok || !data.invoice) {
          if (manual) setError(data.error ?? d.common.somethingWentWrong);
          return false;
        }

        if (data.paid) {
          setPaidAmount(data.invoice.paidAmount || data.invoice.amount);
          setNewBalance(data.wallet?.balance ?? null);
          setInvoice(null);
          // Pull the server-rendered balance and history back into sync.
          router.refresh();
          return true;
        }

        setInvoice(data.invoice);
        if (data.invoice.status === 'EXPIRED') {
          setError(ti.expired);
          setInvoice(null);
          return true;
        }
        if (data.invoice.status === 'CANCELED') {
          setError(ti.canceled);
          setInvoice(null);
          return true;
        }
        if (manual) setNotice(ti.notPaidYet);
        return false;
      } catch {
        if (manual) setError(d.common.networkError);
        return false;
      } finally {
        if (manual) setChecking(false);
      }
    },
    [d.common.networkError, d.common.somethingWentWrong, router, ti.canceled, ti.expired, ti.notPaidYet],
  );

  // Poll while a QR is on screen. Cleared on unmount so a driver navigating away
  // does not leave a timer hammering QPay.
  const invoiceId = invoice?.id;
  const startedAt = useRef(0);

  useEffect(() => {
    if (!invoiceId) return;
    startedAt.current = Date.now();
    let stop = false;

    const timer = setInterval(async () => {
      if (stop) return;
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        clearInterval(timer);
        return;
      }
      const done = await check(invoiceId, false);
      if (done) clearInterval(timer);
    }, POLL_INTERVAL_MS);

    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [invoiceId, check]);

  function reset() {
    setInvoice(null);
    setPaidAmount(null);
    setNewBalance(null);
    setSelected(null);
    setCustom('');
    setError('');
    setNotice('');
    setFieldError('');
  }

  if (!config.enabled || !config.topUpEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardBody>
          <Alert tone="warning">{t.disabled}</Alert>
        </CardBody>
      </Card>
    );
  }

  // ---- Paid ----------------------------------------------------------------
  if (paidAmount !== null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <Alert tone="success" title={format(ti.paid, { amount: money(paidAmount) })}>
            {newBalance !== null && format(ti.newBalance, { balance: money(newBalance) })}
          </Alert>
          <Button variant="secondary" onClick={reset}>
            {ti.startOver}
          </Button>
        </CardBody>
      </Card>
    );
  }

  // ---- Awaiting payment ----------------------------------------------------
  if (invoice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{ti.title}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted">{ti.amount}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {money(invoice.amount)}
            </p>
          </div>

          {invoice.qrImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- a base64 QR from QPay, not an optimisable asset
            <img
              src={
                invoice.qrImage.startsWith('data:')
                  ? invoice.qrImage
                  : `data:image/png;base64,${invoice.qrImage}`
              }
              alt={ti.qrAlt}
              width={280}
              height={280}
              className="mx-auto size-64 rounded-2xl bg-white p-3 ring-1 ring-border sm:size-72"
            />
          ) : (
            <p className="rounded-xl bg-surface-muted px-4 py-6 text-center text-sm text-muted">
              {invoice.qrText ?? d.common.loading}
            </p>
          )}

          <p className="text-center text-sm text-muted">{ti.instruction}</p>

          {invoice.deeplinks && invoice.deeplinks.length > 0 && (
            <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {invoice.deeplinks
                .filter((link) => link.link)
                .map((link) => (
                  <li key={link.link}>
                    <a
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.description ?? link.name}
                      className="flex h-full flex-col items-center gap-1.5 rounded-xl p-2 ring-1 ring-border transition hover:bg-surface-muted"
                    >
                      {link.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- bank logos are served by QPay
                        <img
                          src={link.logo}
                          alt=""
                          width={32}
                          height={32}
                          className="size-8 rounded-lg object-contain"
                        />
                      ) : (
                        <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-surface-muted text-xs">
                          ₮
                        </span>
                      )}
                      <span className="line-clamp-2 text-center text-[11px] leading-tight text-muted">
                        {link.name}
                      </span>
                    </a>
                  </li>
                ))}
            </ul>
          )}

          {notice && <Alert tone="info">{notice}</Alert>}
          {error && <Alert tone="danger">{error}</Alert>}

          <div className="flex flex-wrap items-center gap-3">
            <Button loading={checking} onClick={() => void check(invoice.id, true)}>
              {checking ? ti.checking : ti.checkNow}
            </Button>
            <Button variant="ghost" onClick={reset}>
              {d.common.cancel}
            </Button>
            <span className="flex items-center gap-2 text-sm text-muted">
              <span
                aria-hidden
                className="size-2 animate-pulse rounded-full bg-brand"
              />
              {ti.waiting}
            </span>
          </div>

          {invoice.expiresAt && (
            <p className="text-xs text-muted">
              {format(ti.expiresAt, {
                time: new Date(invoice.expiresAt).toLocaleTimeString(intlLocale(locale), {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })}
            </p>
          )}
        </CardBody>
      </Card>
    );
  }

  // ---- Choose an amount ----------------------------------------------------
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-5">
        {error && <Alert tone="danger">{error}</Alert>}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">{t.chooseAmount}</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {config.presets.map((preset) => {
              const active = selected === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSelected(active ? null : preset);
                    setCustom('');
                    setFieldError('');
                  }}
                  className={cn(
                    'h-14 rounded-xl text-base font-semibold tabular-nums transition',
                    active
                      ? 'bg-brand text-brand-contrast shadow-sm'
                      : 'bg-surface text-foreground ring-1 ring-border hover:bg-surface-muted',
                  )}
                >
                  {money(preset)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <form onSubmit={createInvoice} noValidate className="space-y-4">
          <Field
            label={t.customAmount}
            htmlFor="topup-amount"
            hint={format(t.amountRange, {
              min: money(config.minTopUp),
              max: money(config.maxTopUp),
            })}
            error={fieldError || undefined}
          >
            <Input
              id="topup-amount"
              name="amount"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t.customPlaceholder}
              value={custom}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'topup-amount-error' : 'topup-amount-hint'}
              onChange={(event) => {
                // Digits only: QPay settles whole tugrik, and a stray separator
                // would otherwise fail validation with a confusing message.
                setCustom(event.target.value.replace(/[^\d]/g, ''));
                setSelected(null);
                setFieldError('');
              }}
            />
          </Field>

          <Button type="submit" size="lg" loading={creating} disabled={!Number.isFinite(amount)}>
            {creating
              ? t.submitting
              : Number.isFinite(amount) && amount > 0
                ? `${t.submit} · ${money(amount)}`
                : t.submit}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
