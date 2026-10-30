'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { format, useI18n } from '@/components/i18n-provider';
import { Alert, Button, Card, Modal } from '@/components/ui';
import type { SavedCard, TopUpInvoice, WalletConfig } from '@/lib/types';
import { cn, formatMoney, intlLocale } from '@/lib/utils';
import { WALLET_CHANGED_EVENT, announceWalletEntry } from '@/components/wallet-watcher';
import { useToastMessage } from '@/lib/use-toast-message';

/**
 * Top-up as one short flow: pick an amount, pick how to pay, press the one
 * button that says exactly what will happen.
 *
 *   - Saved card: charged at once after an "are you sure?" (Golomt token).
 *   - Bank card:  Golomt Bank's hosted page, which sends the driver back here
 *                 with `?topup=<id>` so the outcome shows on return.
 *   - QPay:       a QR to scan with a banking app, polled until paid.
 *
 * Payment is confirmed by polling our own API, which asks the bank and credits
 * the wallet server-side. Nothing here decides that money arrived — the screen
 * only reflects what the CSMS reports, so a driver cannot fake a paid balance.
 */

interface TopUpPanelProps {
  config: WalletConfig;
  /** A card payment the driver has just come back from, as the server found it. */
  returned?: { invoice: TopUpInvoice; paid: boolean; balance: number | null };
  /** Bank cards saved for one-tap top-ups. */
  cards?: SavedCard[];
}

type Invoice = TopUpInvoice & { qrImage?: string };

/** How the driver pays: a saved card (by id), a new card, or a QPay QR. */
type Method = { kind: 'saved'; card: SavedCard } | { kind: 'card' } | { kind: 'qpay' } | { kind: 'socialpay' } | { kind: 'toki' };

/** `•••• 7733` from the bank's masked `515023******7733`. */
function cardLabel(card: SavedCard): string {
  const last4 = card.cardNumber?.replace(/\D/g, '').slice(-4);
  return last4 ? `•••• ${last4}` : (card.bank ?? '••••');
}

const isSocialPay = (name?: string) => /social\s*pay/i.test(name ?? '');

/** How long to keep polling before asking the driver to confirm by hand. */
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export function TopUpPanel({ config, returned, cards = [] }: TopUpPanelProps) {
  const router = useRouter();
  const { d, locale } = useI18n();
  const t = d.wallet.topUp;
  const ti = d.wallet.invoice;
  const money = (value: number) => formatMoney(value, intlLocale(locale));

  const qrEnabled = config.topUpEnabled;
  const cardEnabled = Boolean(config.cardTopUpEnabled);
  const savedEnabled = cardEnabled && Boolean(config.savedCardsEnabled);
  const socialEnabled = Boolean(config.socialPayEnabled);
  const tokiEnabled = Boolean(config.tokiEnabled);

  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [tokiMode, setTokiMode] = useState<'app' | 'qr' | 'phone'>('app');
  const [tokiPhone, setTokiPhone] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    // Default to QR on desktop/kiosk, app deeplink on mobile
    if (typeof window !== 'undefined' && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      setTokiMode('qr');
    }
  }, []);
  // Back from the bank's card page: start in whatever state the payment is in.
  // A still-open payment lands on the "checking" card and is polled from there.
  const returnedOpen =
    returned && !returned.paid && ['PENDING', 'PARTIALLY_PAID'].includes(returned.invoice.status);
  const [invoice, setInvoice] = useState<Invoice | null>(returnedOpen ? returned!.invoice : null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(() =>
    !returned || returned.paid || returnedOpen
      ? ''
      : returned.invoice.status === 'EXPIRED'
        ? ti.expired
        : (returned.invoice.declineReason ?? t.cardFailed),
  );
  const [fieldError, setFieldError] = useState('');
  const [notice, setNotice] = useState('');
  useToastMessage(error, 'error');
  useToastMessage(notice, 'info');
  const [redirecting, setRedirecting] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>(savedEnabled ? cards : []);
  const [saveCard, setSaveCard] = useState(true);
  const [confirmCard, setConfirmCard] = useState<SavedCard | null>(null);
  const [payingCardId, setPayingCardId] = useState<string | null>(null);
  const [removeCard, setRemoveCard] = useState<SavedCard | null>(null);
  const [removing, setRemoving] = useState(false);

  // QPay leads; choosing "card" then preselects the driver's saved card.
  const [method, setMethod] = useState<Method>(() =>
    qrEnabled
      ? { kind: 'qpay' }
      : savedEnabled && cards[0]
        ? { kind: 'saved', card: cards[0] }
        : { kind: 'card' },
  );

  const amount = selected ?? (custom.trim() ? Number(custom.replace(/\s/g, '')) : NaN);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const busy = creating || redirecting || payingCardId !== null;

  function validate(value: number): string {
    if (!Number.isFinite(value) || value <= 0) return t.invalidAmount;
    if (!Number.isInteger(value)) return t.invalidAmount;
    if (value < config.minTopUp) return format(t.tooSmall, { min: money(config.minTopUp) });
    if (value > config.maxTopUp) return format(t.tooLarge, { max: money(config.maxTopUp) });
    return '';
  }

  /** The one button: does whatever the chosen method means. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = validate(amount);
    if (problem) {
      setFieldError(problem);
      return;
    }
    setError('');
    if (method.kind === 'saved') setConfirmCard(method.card);
    else void requestInvoice(method.kind);
  }

  async function requestInvoice(kind: 'qpay' | 'card' | 'socialpay' | 'toki') {
    setCreating(true);
    setError('');
    setFieldError('');
    setNotice('');

    try {
      const payload: Record<string, unknown> = { amount, method: kind };
      if (kind === 'card' && savedEnabled) payload.saveCard = saveCard;
      if (kind === 'toki') {
        payload.tokiMethod = tokiMode === 'phone' ? 'PHONE' : tokiMode === 'app' ? 'DEEPLINK' : 'QR';
        if (tokiMode === 'phone') {
          const cleanPhone = tokiPhone.trim();
          if (!cleanPhone) {
            setError('Toki бүртгэлтэй утасны дугаараа оруулна уу');
            setCreating(false);
            return;
          }
          payload.tokiPhoneNo = cleanPhone;
        }
      }

      const res = await fetch('/app-api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

      if (kind === 'card' || kind === 'socialpay') {
        if (!data.invoice.paymentUrl) {
          setError(ti.failed);
          return;
        }
        // The bank's page takes over; it sends the driver back with ?topup=.
        setRedirecting(true);
        window.location.assign(data.invoice.paymentUrl);
        return;
      }

      if (kind === 'toki' && tokiMode === 'app') {
        const link = data.invoice.tokiDeeplink || data.invoice.deeplinks?.[0]?.link;
        if (link) {
          window.location.assign(link);
        }
      }

      setInvoice(data.invoice);
    } catch {
      setError(d.common.networkError);
    } finally {
      setCreating(false);
    }
  }

  /**
   * Money arrived: the success shows as a toast (the wallet watcher's, so it
   * is never shown twice) and this panel goes straight back to "top up", with
   * the balance and history refreshed behind it.
   */
  const settled = useCallback((paid: Invoice) => {
    if (paid.walletEntryId) {
      announceWalletEntry(
        { id: paid.walletEntryId, type: 'TOPUP', amount: paid.paidAmount || paid.amount, description: paid.description },
        locale,
      );
    }
    setInvoice(null);
    setSelected(null);
    setCustom('');
    setError('');
    setNotice('');
    window.dispatchEvent(new Event(WALLET_CHANGED_EVENT));
    // Drop ?topup= so a reload does not re-announce the payment.
    if (returned) router.replace('/account/wallet');
    else router.refresh();
  }, [locale, returned, router]);

  // Back from the bank's page already paid: just toast and tidy the URL.
  useEffect(() => {
    if (!returned?.paid) return;
    const paid = returned.invoice;
    if (paid.walletEntryId) {
      announceWalletEntry(
        { id: paid.walletEntryId, type: 'TOPUP', amount: paid.paidAmount || paid.amount, description: paid.description },
        locale,
      );
    }
    window.dispatchEvent(new Event(WALLET_CHANGED_EVENT));
    router.replace('/account/wallet');
  }, [locale, returned, router]);

  /** Ask the server whether the bank has settled the invoice yet. */
  const check = useCallback(
    async (id: string, manual: boolean): Promise<boolean> => {
      if (manual) {
        setChecking(true);
        setNotice('');
        setError('');
      }
      try {
        const res = await fetch(`/app-api/wallet/topup/${encodeURIComponent(id)}`);
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
          settled(data.invoice);
          return true;
        }

        // The poll strips qrImage (a large base64 blob) and carries no
        // deeplinks. Take only what can change, or the QR would vanish.
        setInvoice((current) =>
          current
            ? { ...current, status: data.invoice!.status, paidAmount: data.invoice!.paidAmount }
            : data.invoice!,
        );
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
        if (data.invoice.status === 'FAILED') {
          setError(data.invoice.declineReason ?? t.cardFailed);
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
    [
      d.common.networkError,
      d.common.somethingWentWrong,
      settled,
      t.cardFailed,
      ti.canceled,
      ti.expired,
      ti.notPaidYet,
    ],
  );

  // Poll while a payment is open. Cleared on unmount so a driver navigating
  // away does not leave a timer hammering the bank.
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

  async function paySaved(card: SavedCard) {
    setConfirmCard(null);
    setPayingCardId(card.id);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/app-api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method: 'saved_card', cardId: card.id }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        invoice?: Invoice;
        paid?: boolean;
        wallet?: { balance: number } | null;
        error?: string;
      };
      if (!res.ok || !data.invoice) {
        setError(data.error ?? t.cardFailed);
        return;
      }
      if (data.paid) {
        settled(data.invoice);
        return;
      }
      if (data.invoice.status === 'FAILED') {
        setError(data.invoice.declineReason ?? t.cardFailed);
        return;
      }
      // The bank's answer was lost on the way; poll it like a card page.
      setInvoice(data.invoice);
    } catch {
      setError(d.common.networkError);
    } finally {
      setPayingCardId(null);
    }
  }

  async function confirmRemove(card: SavedCard) {
    setRemoving(true);
    try {
      const res = await fetch(`/app-api/wallet/cards/${encodeURIComponent(card.id)}`, { method: 'DELETE' });
      if (res.ok || res.status === 404) {
        const rest = savedCards.filter((c) => c.id !== card.id);
        setSavedCards(rest);
        if (method.kind === 'saved' && method.card.id === card.id) {
          setMethod(rest[0] ? { kind: 'saved', card: rest[0] } : qrEnabled ? { kind: 'qpay' } : { kind: 'card' });
        }
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? d.common.somethingWentWrong);
      }
    } catch {
      setError(d.common.networkError);
    } finally {
      setRemoving(false);
      setRemoveCard(null);
    }
  }

  function reset() {
    setInvoice(null);
    setSelected(null);
    setCustom('');
    setError('');
    setNotice('');
    setFieldError('');
  }

  if (!config.enabled || (!qrEnabled && !cardEnabled)) {
    return (
      <Panel title={t.title}>
        <Alert tone="warning">{t.disabled}</Alert>
      </Panel>
    );
  }

  // ---- Awaiting a card payment ---------------------------------------------
  if (invoice && invoice.provider === 'GOLOMT') {
    return (
      <Panel title={invoice.golomtChannel === 'SOCIALPAY' ? t.socialTitle : t.cardTitle}>
        <div className="space-y-4">
          <AmountHeadline label={ti.amount} value={money(invoice.amount)} />
          <WaitingLine text={invoice.golomtChannel === 'SOCIALPAY' ? t.socialBody : t.cardBody} />
          {invoice.paymentUrl && (
            <a
              href={invoice.paymentUrl}
              className="inline-flex items-center text-sm font-semibold text-brand hover:underline"
            >
              {t.cardReopen}
            </a>
          )}
          <InvoiceActions
            checking={checking}
            checkLabel={checking ? ti.checking : ti.checkNow}
            cancelLabel={d.common.cancel}
            onCheck={() => void check(invoice.id, true)}
            onCancel={reset}
          />
        </div>
      </Panel>
    );
  }

  // ---- Awaiting a Toki payment (Deeplink or Phone Push) ---------------------
  if (
    invoice &&
    invoice.provider === 'TOKI' &&
    (!invoice.qrImage || invoice.tokiPhoneNo || invoice.tokiDeeplink || tokiMode === 'app')
  ) {
    const deeplink = invoice.tokiDeeplink || invoice.deeplinks?.[0]?.link;
    return (
      <Panel title={t.tokiTitle}>
        <div className="space-y-4 text-center">
          <AmountHeadline label={ti.amount} value={money(invoice.amount)} />
          <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-surface-muted ring-1 ring-border">
            <Image src="/toki.png" alt="Toki" width={48} height={48} className="size-12 object-contain" />
          </div>
          {invoice.tokiPhoneNo ? (
            <p className="text-sm font-semibold text-foreground">
              Таны Toki апп руу ({invoice.tokiPhoneNo}) нэхэмжлэх илгээлээ.
            </p>
          ) : (
            <p className="text-sm font-semibold text-foreground">
              Toki апп дээр төлбөрөө баталгаажуулна уу.
            </p>
          )}
          {deeplink && (
            <div className="pt-1">
              <a
                href={deeplink}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-contrast shadow-sm transition hover:bg-brand-strong"
              >
                <TokiIcon />
                Toki апп нээх
              </a>
            </div>
          )}
          <WaitingLine text={t.tokiBody} />
          <InvoiceActions
            checking={checking}
            checkLabel={checking ? ti.checking : ti.checkNow}
            cancelLabel={d.common.cancel}
            onCheck={() => void check(invoice.id, true)}
            onCancel={reset}
          />
        </div>
      </Panel>
    );
  }

  // ---- Awaiting a QPay / Toki QR payment -----------------------------------
  if (invoice) {
    const isToki = invoice.provider === 'TOKI';
    return (
      <Panel title={isToki ? 'Toki QR уншуулна уу' : ti.title}>
        <div className="space-y-4">
          <AmountHeadline label={ti.amount} value={money(invoice.amount)} />

          {invoice.qrImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- a base64 QR from QPay, not an optimisable asset
            <img
              src={invoice.qrImage.startsWith('data:') ? invoice.qrImage : `data:image/png;base64,${invoice.qrImage}`}
              alt={ti.qrAlt}
              width={280}
              height={280}
              className="mx-auto size-60 rounded-2xl bg-white p-3 ring-1 ring-border sm:size-64"
            />
          ) : (
            <p className="rounded-xl bg-surface-muted px-4 py-6 text-center text-sm text-muted">
              {invoice.qrText ?? d.common.loading}
            </p>
          )}

          <p className="text-center text-sm text-muted">{ti.instruction}</p>

          {isToki && (invoice.tokiDeeplink || invoice.deeplinks?.[0]?.link) && (
            <div className="pt-1">
              <a
                href={invoice.tokiDeeplink || invoice.deeplinks?.[0]?.link}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-contrast shadow-sm transition hover:bg-brand-strong"
              >
                <TokiIcon />
                Toki апп-аар төлөх
              </a>
            </div>
          )}

          {invoice.deeplinks && invoice.deeplinks.length > 0 && (
            <ul className="grid grid-cols-3 min-[360px]:grid-cols-4 gap-2 sm:grid-cols-6">
              {[...invoice.deeplinks]
                .filter((link) => link.link)
                // SocialPay is the app most drivers reach for, so it leads.
                .sort((a, b) => Number(isSocialPay(b.name)) - Number(isSocialPay(a.name)))
                .map((link) => (
                  <li key={link.link}>
                    <a
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={link.description ?? link.name}
                      className={cn(
                        'glass-chip flex h-full flex-col items-center gap-1.5 rounded-xl p-2 ring-1 transition hover:bg-surface-muted',
                        isSocialPay(link.name) ? 'ring-2 ring-brand' : 'ring-border',
                      )}
                    >
                      {link.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- bank logos are served by QPay
                        <img src={link.logo} alt="" width={32} height={32} className="size-8 rounded-lg object-contain" />
                      ) : (
                        <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-surface-muted text-xs">
                          ₮
                        </span>
                      )}
                      <span className="line-clamp-2 text-center text-[11px] leading-tight text-muted">{link.name}</span>
                    </a>
                  </li>
                ))}
            </ul>
          )}


          <WaitingLine text={ti.waiting} />
          <InvoiceActions
            checking={checking}
            checkLabel={checking ? ti.checking : ti.checkNow}
            cancelLabel={d.common.cancel}
            onCheck={() => void check(invoice.id, true)}
            onCancel={reset}
          />

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
        </div>
      </Panel>
    );
  }

  // ---- Choose amount and method --------------------------------------------
  const methodOptions: {
    value: 'qpay' | 'card' | 'socialpay' | 'toki';
    label: string;
    icon: ReactNode;
    disabled?: boolean;
  }[] = [
    ...(qrEnabled ? [{ value: 'qpay' as const, label: t.methodQr, icon: <QrIcon /> }] : []),
    ...(tokiEnabled ? [{ value: 'toki' as const, label: t.methodToki, icon: <TokiIcon />, disabled: true }] : []),
    ...(cardEnabled ? [{ value: 'card' as const, label: t.methodCard, icon: <CardIcon /> }] : []),
    ...(socialEnabled ? [{ value: 'socialpay' as const, label: t.methodSocial, icon: <SocialIcon /> }] : []),
  ];
  const ctaLabel = !hasAmount
    ? t.chooseAmountFirst
    : method.kind === 'saved'
      ? format(t.ctaSaved, { card: cardLabel(method.card), amount: money(amount) })
      : method.kind === 'card'
        ? format(t.ctaCard, { amount: money(amount) })
        : method.kind === 'socialpay'
          ? format(t.ctaSocial, { amount: money(amount) })
          : method.kind === 'toki'
            ? tokiMode === 'phone'
              ? `Toki апп руу илгээх · ${money(amount)}`
              : tokiMode === 'app'
                ? `Toki апп-аар төлөх · ${money(amount)}`
                : format(t.ctaToki, { amount: money(amount) })
            : format(t.ctaQr, { amount: money(amount) });
  const ctaBusyLabel = redirecting
    ? t.redirecting
    : payingCardId !== null
      ? t.payingWithSaved
      : t.submitting;

  return (
    <Panel
      title={t.title}
      aside={format(t.amountRange, { min: money(config.minTopUp), max: money(config.maxTopUp) })}
    >
      <form onSubmit={submit} noValidate className="space-y-6">
        {/* 1 — amount */}
        <fieldset>
          <Step n={1} label={t.stepAmount} />
          <div className="mt-3 grid grid-cols-2 min-[360px]:grid-cols-3 gap-2 sm:grid-cols-4">
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
                    'h-12 rounded-xl text-sm font-semibold tabular-nums transition duration-150 sm:text-[15px]',
                    'active:scale-[0.97] motion-reduce:active:scale-100',
                    active
                      ? 'bg-brand text-brand-contrast shadow-md shadow-brand/25'
                      : 'bg-surface-muted/60 text-foreground ring-1 ring-border hover:ring-brand/50',
                  )}
                >
                  {money(preset)}
                </button>
              );
            })}
          </div>
          <label
            className={cn(
              'relative mt-2 flex h-12 items-center rounded-xl ring-1 transition',
              custom
                ? 'bg-surface ring-2 ring-brand'
                : 'bg-surface-muted/60 ring-border focus-within:ring-2 focus-within:ring-brand',
            )}
          >
            <span className="sr-only">{t.customAmount}</span>
            <span aria-hidden className="pl-3 text-sm font-semibold text-muted">
              ₮
            </span>
            <input
              id="topup-amount"
              name="amount"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={t.otherAmount}
              value={custom ? Number(custom).toLocaleString(intlLocale(locale)) : ''}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? 'topup-amount-error' : undefined}
              onChange={(event) => {
                // Digits only: payments settle in whole tugrik.
                setCustom(event.target.value.replace(/[^\d]/g, ''));
                setSelected(null);
                setFieldError('');
              }}
              className="h-full w-full min-w-0 bg-transparent px-2 text-sm font-semibold tabular-nums text-foreground outline-none placeholder:font-medium placeholder:text-muted"
            />
          </label>
          {fieldError && (
            <p id="topup-amount-error" className="mt-2 text-sm font-medium text-danger">
              {fieldError}
            </p>
          )}
        </fieldset>

        {/* 2 — how to pay: QPay, Toki, Card, or SocialPay */}
        {methodOptions.length > 1 || (cardEnabled && savedCards.length > 0) ? (
          <fieldset>
            <Step n={2} label={t.stepMethod} />

            {methodOptions.length > 1 && (
              <div
                role="radiogroup"
                aria-label={t.stepMethod}
                className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3"
              >
                {methodOptions.map((o) => {
                  const currentKind = method.kind === 'saved' ? 'card' : method.kind;
                  const active = currentKind === o.value;
                  const isDisabled = busy || Boolean(o.disabled);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-disabled={o.disabled}
                      disabled={isDisabled}
                      onClick={() => {
                        if (o.disabled) return;
                        setMethod(
                          o.value === 'card'
                            ? savedCards[0]
                              ? { kind: 'saved', card: savedCards[0] }
                              : { kind: 'card' }
                            : { kind: o.value },
                        );
                      }}
                      className={cn(
                        'group relative flex h-14 items-center gap-2.5 sm:gap-3 rounded-2xl border px-3 sm:px-3.5 text-left transition-all duration-150',
                        o.disabled
                          ? 'cursor-not-allowed opacity-50 border-border/60 bg-surface-muted/20 text-muted'
                          : 'cursor-pointer active:scale-[0.98] motion-reduce:active:scale-100',
                        active
                          ? 'border-brand bg-brand/10 text-foreground ring-2 ring-brand/30 shadow-sm'
                          : !o.disabled &&
                              'border-border/80 bg-surface-muted/40 text-muted hover:border-brand/40 hover:bg-surface-muted hover:text-foreground',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'grid size-8 shrink-0 place-items-center rounded-xl transition-colors',
                          active
                            ? 'bg-brand/15 text-brand'
                            : 'bg-surface text-muted group-hover:text-foreground group-hover:bg-surface-muted',
                        )}
                      >
                        {o.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
                          {o.label}
                        </span>
                      </div>
                      <span
                        aria-hidden
                        className={cn(
                          'size-4 shrink-0 rounded-full border flex items-center justify-center transition-colors',
                          active ? 'border-brand bg-brand text-brand-contrast' : 'border-border bg-transparent',
                        )}
                      >
                        {active && <span className="size-1.5 rounded-full bg-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {method.kind !== 'card' && method.kind !== 'saved' && (
              <p className="mt-2.5 text-xs text-muted">
                {method.kind === 'qpay'
                  ? t.methodQrHint
                  : method.kind === 'toki'
                    ? t.methodTokiHint
                    : t.methodSocialHint}
              </p>
            )}

            {/* Saved cards live inside "card": pick one, or pay with a new card. */}
            {(method.kind === 'card' || method.kind === 'saved') && savedCards.length > 0 && (
              <div role="radiogroup" aria-label={t.savedCardsTitle} className="mt-3 flex flex-wrap gap-2">
                {savedCards.map((card) => {
                  const active = method.kind === 'saved' && method.card.id === card.id;
                  return (
                    <span
                      key={card.id}
                      className={cn(
                        'glass-chip inline-flex h-10 items-center rounded-full pl-1 pr-1 ring-1 transition',
                        active ? 'ring-2 ring-brand' : 'ring-border',
                      )}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        disabled={busy}
                        onClick={() => setMethod({ kind: 'saved', card })}
                        className="inline-flex h-full items-center gap-2 rounded-full pl-2.5 pr-1 text-sm font-semibold tabular-nums text-foreground"
                      >
                        <span className={cn('size-2 rounded-full', active ? 'bg-brand' : 'bg-border')} aria-hidden />
                        {cardLabel(card)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoveCard(card)}
                        disabled={busy}
                        aria-label={`${t.removeCard} ${cardLabel(card)}`}
                        title={t.removeCard}
                        className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-danger"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5" aria-hidden>
                          <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={method.kind === 'card'}
                  disabled={busy}
                  onClick={() => setMethod({ kind: 'card' })}
                  className={cn(
                    'glass-chip inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 transition',
                    method.kind === 'card' ? 'text-foreground ring-2 ring-brand' : 'text-muted ring-border',
                  )}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-4" aria-hidden>
                    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                  </svg>
                  {t.newCard}
                </button>
              </div>
            )}

            {/* Under the method switch with the same gap as the QPay/SocialPay
                hint, so the card option reads like the other two. */}
            {method.kind === 'card' && savedEnabled && (
              <label className="mt-2.5 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(event) => setSaveCard(event.target.checked)}
                  className="m-0 size-3.5 shrink-0 rounded accent-[var(--brand)]"
                />
                <span className="text-xs text-muted">{t.saveCard}</span>
              </label>
            )}

            {/* Toki mode selection: Toki App (deeplink), QR, or direct Phone Push */}
            {method.kind === 'toki' && (
              <div className="mt-3 space-y-2.5">
                <div className="inline-flex flex-wrap rounded-lg bg-surface-muted p-1 text-xs font-semibold gap-1">
                  <button
                    type="button"
                    onClick={() => setTokiMode('app')}
                    className={cn(
                      'rounded-md px-3 py-1.5 transition cursor-pointer',
                      tokiMode === 'app' ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
                    )}
                  >
                    Toki апп
                  </button>
                  <button
                    type="button"
                    onClick={() => setTokiMode('qr')}
                    className={cn(
                      'rounded-md px-3 py-1.5 transition cursor-pointer',
                      tokiMode === 'qr' ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
                    )}
                  >
                    Toki QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setTokiMode('phone')}
                    className={cn(
                      'rounded-md px-3 py-1.5 transition cursor-pointer',
                      tokiMode === 'phone' ? 'bg-surface text-foreground shadow-sm' : 'text-muted hover:text-foreground',
                    )}
                  >
                    Утасны дугаар
                  </button>
                </div>
                {tokiMode === 'phone' && (
                  <div className="max-w-xs space-y-1">
                    <label className="block text-xs text-muted">Toki бүртгэлтэй утасны дугаар</label>
                    <input
                      type="tel"
                      value={tokiPhone}
                      onChange={(e) => setTokiPhone(e.target.value)}
                      placeholder="99112233"
                      className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                )}
              </div>
            )}
          </fieldset>
        ) : null}

        <div>
          <Button
            type="submit"
            size="lg"
            className="w-full justify-center"
            loading={busy}
            disabled={!hasAmount || busy}
          >
            {busy ? ctaBusyLabel : ctaLabel}
          </Button>
        </div>
      </form>

      {confirmCard && (
        <ConfirmDialog
          title={t.confirmSavedTitle}
          body={format(t.confirmSavedBody, { card: cardLabel(confirmCard), amount: money(amount) })}
          yes={t.confirmSavedYes}
          no={d.common.cancel}
          onYes={() => void paySaved(confirmCard)}
          onNo={() => setConfirmCard(null)}
        />
      )}
      {removeCard && (
        <ConfirmDialog
          danger
          busy={removing}
          title={t.removeCardTitle}
          body={format(t.removeCardBody, { card: cardLabel(removeCard) })}
          yes={t.removeCardYes}
          no={d.common.cancel}
          onYes={() => void confirmRemove(removeCard)}
          onNo={() => setRemoveCard(null)}
        />
      )}
    </Panel>
  );
}

// ---------------------------------------------------------------------------

function Panel({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
        {aside && <p className="text-xs text-muted">{aside}</p>}
      </div>
      {children}
    </Card>
  );
}

function Step({ n, label }: { n: number; label: string }) {
  // `display: flex` directly on a `<legend>` breaks its box in Safari/WebKit
  // (it stops reserving layout height, so the next sibling overlaps it) —
  // the legend itself stays block-level and the flex row lives on a span.
  return (
    <legend className="text-sm font-semibold text-foreground">
      <span className="flex items-center gap-2">
        <span aria-hidden className="grid size-5 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand-strong">
          {n}
        </span>
        {label}
      </span>
    </legend>
  );
}

function AmountHeadline({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function WaitingLine({ text }: { text: string }) {
  return (
    <p className="flex items-center justify-center gap-2 text-center text-sm text-muted">
      <span aria-hidden className="size-2 shrink-0 animate-pulse rounded-full bg-brand" />
      {text}
    </p>
  );
}


function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  );
}

function SocialIcon() {
  return (
    <Image src="/social pay.png" alt="" aria-hidden width={20} height={20} className="size-5 rounded-[5px] object-contain" />
  );
}

function TokiIcon() {
  return (
    <Image src="/toki.png" alt="" aria-hidden width={20} height={20} className="size-5 rounded-[5px] object-contain" />
  );
}

function QrIcon() {
  return (
    <Image src="/qpay-icon.svg" alt="QPay" aria-hidden width={20} height={20} className="size-5 object-contain" />
  );
}

function ConfirmDialog({
  title,
  body,
  yes,
  no,
  onYes,
  onNo,
  danger = false,
  busy = false,
}: {
  title: string;
  body: string;
  yes: string;
  no: string;
  onYes: () => void;
  onNo: () => void;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <Modal onClose={onNo} maxWidth="sm">
      <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 sm:pb-5 text-center">
        <h3 className="text-base sm:text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-1.5 text-xs sm:text-sm leading-5 sm:leading-6 text-muted">{body}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border px-4 sm:px-6 py-3.5 sm:py-4">
        {/* «Цуцлах» is red with white text everywhere. */}
        <Button type="button" variant="danger" size="md" className="sm:h-11" onClick={onNo} disabled={busy}>
          {no}
        </Button>
        <Button type="button" variant={danger ? 'danger' : 'primary'} size="md" className="sm:h-11" onClick={onYes} loading={busy} autoFocus>
          {yes}
        </Button>
      </div>
    </Modal>
  );
}

/** «I've paid» and «Цуцлах» under an open invoice: one row, equal halves. */
function InvoiceActions({
  checking,
  checkLabel,
  cancelLabel,
  onCheck,
  onCancel,
}: {
  checking: boolean;
  checkLabel: string;
  cancelLabel: string;
  onCheck: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
      <Button
        size="md"
        className="h-11 sm:h-12 w-full justify-center px-2 text-xs min-[380px]:text-sm sm:text-base font-semibold truncate"
        loading={checking}
        onClick={onCheck}
        title={checkLabel}
      >
        {checkLabel}
      </Button>
      <Button
        size="md"
        variant="danger"
        className="h-11 sm:h-12 w-full justify-center px-2 text-xs min-[380px]:text-sm sm:text-base font-semibold"
        onClick={onCancel}
      >
        {cancelLabel}
      </Button>
    </div>
  );
}
