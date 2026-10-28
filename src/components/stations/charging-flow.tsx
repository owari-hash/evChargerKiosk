'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { format, useI18n } from '@/components/i18n-provider';
import { Alert, Badge, Button, ButtonLink, Card, Input, Modal } from '@/components/ui';
import { EbarimtModal } from '@/components/account/ebarimt-modal';
import { GuestAuthFlow } from './guest-auth-flow';
import { QuickPayModal } from './quick-pay-modal';
import {
  noteStartRequested,
  registerChargingFlow,
  requestSessionCheck,
  showSessionOnScreen,
} from '@/lib/session-events';
import type {
  ChargingSession,
  EbarimtChoice,
  StationAvailability,
  StationConnector,
  TariffZone,
} from '@/lib/types';
import {
  cn,
  connectorLetter,
  connectorStatusLabel,
  connectorStatusTone,
  formatDuration,
  formatKwh,
  formatMoney,
  formatPower,
  formatPowerKw,
  formatTariff,
  intlLocale,
} from '@/lib/utils';
import { useToastMessage } from '@/lib/use-toast-message';
import { showToast } from '@/lib/toast-store';

/** Poll interval while a session is running, in milliseconds. */
const LIVE_MS = 2_000;
/** Fast poll while waiting for station start handshake. */
const STARTING_MS = 1_000;
/** Regular station status poll interval. */
const IDLE_MS = 3_000;

/**
 * Internal states of the flow. The driver only ever sees four steps (see
 * `VISIBLE_STEP`): the states after "start" happen on their own, so they are
 * shown as the status of the last step rather than as steps of their own.
 */
export type FlowStep =
  | 'signin'
  | 'tag'
  | 'connector'
  | 'plug'
  | 'start'
  | 'preparing'
  | 'charging'
  | 'stopping'
  | 'done';

const VISIBLE_STEP: Record<FlowStep, number> = {
  signin: 0,
  // The charge tag is issued with the account, so there is nothing for the
  // driver to do here; it is part of signing in and only surfaces if missing.
  tag: 0,
  connector: 1,
  plug: 2,
  start: 3,
  preparing: 3,
  charging: 3,
  stopping: 3,
  done: 3,
};

const AUTOMATIC: ReadonlySet<FlowStep> = new Set(['preparing', 'charging', 'stopping', 'done']);

/** Connector states that carry a running session's live readings. */
const LIVE_STATUSES = new Set(['Charging', 'SuspendedEV', 'SuspendedEVSE', 'Finishing']);

interface LiveState {
  availability: StationAvailability;
  connectors: StationConnector[];
  availableConnectors: number;
  totalConnectors: number;
  tariffPerKwh?: number;
  /** The rate outside every time-of-day zone. */
  defaultTariffPerKwh?: number;
  currentTariffZoneName?: string;
  tariffZones?: TariffZone[];
  session: ChargingSession | null;
}

export interface ChargingFlowProps {
  stationId: string;
  connectors: StationConnector[];
  availability: StationAvailability;
  tariffPerKwh?: number;
  signedIn: boolean;
  hasIdTag: boolean;
  remoteStartEnabled: boolean;
  /** Gun chosen for the driver, e.g. by scanning the QR sticker on it. */
  initialConnectorId?: number;
  /** Where sign-in should send the driver back to, query string included. */
  returnTo: string;
}

/**
 * Guns a driver may start right now.
 *
 * `Preparing` is included deliberately: on DC hardware the gun enters that
 * state the moment a cable is plugged into the car, which is precisely when
 * the driver wants to start. A gun already running a session is excluded.
 */
function freeConnectors(connectors: StationConnector[]): StationConnector[] {
  return connectors.filter(
    (c) =>
      c.availability === 'Operative' &&
      !c.currentTransactionId &&
      // Another driver scanned it first and has it open, or is starting on it.
      !c.inUseByOther &&
      (c.status === 'Available' || c.status === 'Preparing'),
  );
}

export function ChargingFlow({
  stationId,
  connectors,
  availability,
  tariffPerKwh,
  signedIn,
  hasIdTag,
  remoteStartEnabled,
  initialConnectorId,
  returnTo,
}: ChargingFlowProps) {
  const { d, locale } = useI18n();
  const intl = intlLocale(locale);
  const t = d.flow;
  /**
   * Arrived by scanning a gun's QR sticker. The flow is then about that one
   * gun only: no picker, no switching to another gun from here. If someone
   * else has it, the driver is told so and shown which guns they can go and
   * scan instead.
   */
  const qrMode = initialConnectorId !== undefined;
  /**
   * Nothing is offered until the first live read: in QR mode it says who has
   * the gun, and for a signed-in driver whether their own charge (started
   * from the app, say) is already running here — the start screen used to
   * show for a few seconds before the charge appeared.
   */
  const [synced, setSynced] = useState(!qrMode && !signedIn);
  /** Whether to (re)claim the scanned gun on the next refresh; set each render. */
  const holdRef = useRef(false);


  const [live, setLive] = useState<LiveState>({
    availability,
    connectors,
    availableConnectors: connectors.filter((c) => c.status === 'Available').length,
    totalConnectors: connectors.length,
    tariffPerKwh,
    session: null,
  });
  const [plugged, setPlugged] = useState(false);
  const [requested, setRequested] = useState(false);
  /**
   * A finished session the driver has acknowledged.
   *
   * The API keeps returning their most recent session for up to 15 mins.
   * Dismissing it locally (stored in sessionStorage) lets them start another charge immediately.
   */
  const [dismissedSessionId, setDismissedSessionId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem(`dismissed_session_${stationId}`);
      return stored ? Number(stored) : null;
    } catch {
      return null;
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useToastMessage(error, 'error', d.start.couldNotStartTitle);
  const [staleFeed, setStaleFeed] = useState(false);
  const [showEbarimtModal, setShowEbarimtModal] = useState(false);
  const [ebarimtModalInitialType, setEbarimtModalInitialType] = useState<'B2C_RECEIPT' | 'B2B_RECEIPT'>('B2C_RECEIPT');
  const [authed, setAuthed] = useState(signedIn);
  const [tagged, setTagged] = useState(hasIdTag);
  const [showQuickPay, setShowQuickPay] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isInternal, setIsInternal] = useState(false);
  const [minStartBalance, setMinStartBalance] = useState<number>(1000);
  const [requireBalanceToStart, setRequireBalanceToStart] = useState(false);
  /** Which action is waiting on the driver's "are you sure?". */
  const [confirming, setConfirming] = useState<'start' | 'stop' | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!authed) return;
    try {
      const res = await fetch('/app-api/wallet?limit=1', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.wallet?.balance !== undefined) {
          setWalletBalance(data.wallet.balance);
        }
        if (data?.isInternal || data?.wallet?.isInternal) {
          setIsInternal(true);
        }
        if (typeof data?.config?.minStartBalance === 'number') {
          setMinStartBalance(data.config.minStartBalance);
        }
        if (typeof data?.config?.requireBalanceToStart === 'boolean') {
          setRequireBalanceToStart(data.config.requireBalanceToStart);
        }
      }
    } catch {}
  }, [authed]);

  useEffect(() => {
    void fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    const onFocus = () => void fetchWallet();
    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus);
    };
  }, [fetchWallet]);

  const free = freeConnectors(live.connectors);

  /**
   * The gun the start request will name. It is never guessed: picking "the
   * only free gun" silently targeted the gun the driver was NOT standing at.
   *
   * A QR sticker preselects its gun, but only when that gun is actually free —
   * otherwise the driver lands on the picker with a note saying why.
   */
  const [connectorId, setConnectorId] = useState(() =>
    initialConnectorId !== undefined &&
    freeConnectors(connectors).some((c) => c.connectorId === initialConnectorId)
      ? String(initialConnectorId)
      : '',
  );
  // A chosen gun that someone else has since taken no longer counts. From a
  // QR sticker it is always the scanned gun, picked again as soon as it frees.
  const chosenId = connectorId || (qrMode ? String(initialConnectorId) : '');
  const chosen = free.find((c) => String(c.connectorId) === chosenId);

  // A completed session older than 15 minutes must not block starting a new session.
  const isRecentStop = (s: ChargingSession | null) => {
    if (!s) return false;
    if (s.status === 'Active') return true;
    if (!s.stopTimestamp) return true;
    return Date.now() - new Date(s.stopTimestamp).getTime() < 15 * 60 * 1000;
  };

  const rawSession = live.session;
  const session =
    rawSession &&
    rawSession.transactionId !== dismissedSessionId &&
    isRecentStop(rawSession)
      ? rawSession
      : null;
  const active = session?.status === 'Active' ? session : null;

  const sessionConnector = active
    ? live.connectors.find((c) => c.connectorId === active.connectorId)
    : undefined;

  const awaitingStation = requested && !active;

  const step = resolveStep({
    signedIn: authed,
    hasIdTag: tagged,
    plugged,
    requested: awaitingStation,
    session,
    sessionConnector,
    hasConnector: Boolean(chosen),
  });

  useEffect(() => {
    void fetchWallet();
  }, [step, fetchWallet]);

  const shouldHold =
    qrMode && authed && (step === 'connector' || step === 'plug' || step === 'start');
  /**
   * A charge has run on this page. The hold is only for "scanned, not started
   * yet": once the driver's charge is over and the summary dismissed (or 15
   * minutes old) the flow is back on the start step, and re-claiming the gun
   * from there kept it «in use» for the next driver until this tab closed.
   */
  const chargedHereRef = useRef(false);
  useEffect(() => {
    if (active) chargedHereRef.current = true;
    holdRef.current = shouldHold && !chargedHereRef.current;
  }, [shouldHold, active]);

  /**
   * Someone else has the gun this driver scanned. Shown before sign-in too:
   * there is no point signing in to a gun that is taken.
   */
  const scannedBusy =
    qrMode &&
    synced &&
    (step === 'signin' || step === 'tag' || step === 'connector') &&
    !free.some((c) => c.connectorId === initialConnectorId);
  /** The guns a driver turned away from the scanned one could go and scan. */
  const otherFree = free.filter((c) => c.connectorId !== initialConnectorId);

  const scannedUnavailable =
    initialConnectorId !== undefined &&
    step === 'connector' &&
    !free.some((c) => c.connectorId === initialConnectorId);

  // This flow already shows its own "charging" and "done" states for the
  // session on screen; the site-wide SessionWatcher files those in the bell
  // without a second pop-up on top.
  useEffect(() => registerChargingFlow(), []);
  const shownSessionId = session?.transactionId ?? null;
  useEffect(() => {
    if (shownSessionId === null) return;
    return showSessionOnScreen(shownSessionId);
  }, [shownSessionId]);

  useEffect(() => {
    if (active || (session && session.status !== 'Active')) {
      setRequested(false);
    }
  }, [active, session]);

  // A session that ends while the driver is still deciding has nothing to stop.
  const pendingConfirm = confirming === 'stop' && !active ? null : confirming;

  /**
   * The cable going in flips the gun to `Preparing`; that is the moment to
   * ask "charge here?" without making the driver find a button. Asked once
   * per plug-in, so cancelling does not bring it straight back on the next poll.
   */
  const autoPromptedRef = useRef<number | null>(null);
  const preparingId =
    step === 'plug' && synced && chosen?.status === 'Preparing' ? chosen.connectorId : null;
  useEffect(() => {
    if (preparingId === null) {
      autoPromptedRef.current = null;
      return;
    }
    if (autoPromptedRef.current === preparingId) return;
    autoPromptedRef.current = preparingId;
    setError(null);
    setConfirming((current) => current ?? 'start');
  }, [preparingId]);

  /** Tapping a gun that already has a cable in goes straight to "charge here?". */
  function promptStart(id: number) {
    if (busy || active || awaitingStation) return;
    setConnectorId(String(id));
    setError(null);
    setConfirming('start');
  }

  const refresh = useCallback(async () => {
    if (holdRef.current && initialConnectorId !== undefined) {
      // "I'm at this gun" — so a second scan of the same sticker sees it as
      // in use. Refused quietly if someone else got there first; the live
      // read below then reports it as theirs.
      await fetch(`/app-api/stations/${encodeURIComponent(stationId)}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId: initialConnectorId }),
      }).catch(() => undefined);
    }
    try {
      const res = await fetch(`/app-api/stations/${encodeURIComponent(stationId)}/live`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('live feed unavailable');
      const data = (await res.json()) as LiveState;
      setLive((prev) => mergeLive(prev, data));
      setStaleFeed(false);
    } catch {
      setStaleFeed(true);
    }
    setSynced(true);
    void fetchWallet();
  }, [stationId, initialConnectorId, setLive, fetchWallet]);

  // The server-rendered connector list cannot say who holds a gun; ask now
  // rather than after the first poll interval.
  useEffect(() => {
    if (!qrMode && !signedIn) return;
    const timer = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(timer);
    // Only on arrival; the interval below keeps it fresh afterwards.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const interval = awaitingStation ? STARTING_MS : AUTOMATIC.has(step) ? LIVE_MS : IDLE_MS;
    const timer = setInterval(() => void refresh(), interval);
    return () => clearInterval(timer);
  }, [refresh, step, awaitingStation]);

  /**
   * A gun is only ever picked by scanning its QR sticker, so the driver is
   * standing at the gun the start request will name. Tapping one here says so.
   */
  function requireQr() {
    showToast({ kind: 'info', title: t.qrRequiredTitle, body: '' });
  }

  function chooseAnother() {
    setConnectorId('');
    setPlugged(false);
    setError(null);
  }

  async function start(ebarimt?: EbarimtChoice) {
    if (!chosen) return;
    if (!isInternal && requireBalanceToStart && walletBalance !== null && walletBalance < minStartBalance) {
      setShowQuickPay(true);
      setError(`Хэтэвчний үлдэгдэл хүрэлцэхгүй байна (хамгийн багадаа ${minStartBalance.toLocaleString('mn-MN')}₮). Цэнэглэхээсээ өмнө хэтэвчээ цэнэглэнэ үү.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/app-api/stations/${encodeURIComponent(stationId)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId: chosen.connectorId, ebarimt }),
      });
      const payload = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!res.ok) {
        if (res.status === 402 || payload.error?.includes('Хэтэвч')) {
          setShowQuickPay(true);
        }
        throw new Error(payload.error ?? d.start.requestFailed);
      }
      if (payload.status && payload.status !== 'Accepted') {
        throw new Error(format(d.start.rejectedBody, { status: payload.status }));
      }
      setRequested(true);
      noteStartRequested();
      requestSessionCheck();
      await refresh();
      [500, 1200, 2200, 3500].forEach((delay) => setTimeout(() => void refresh(), delay));
    } catch (err) {
      setError(err instanceof Error ? err.message : d.start.requestFailed);
    } finally {
      setBusy(false);
    }
  }

  /**
   * The driver says the cable is in; this checks it against what the station
   * itself is reporting. A connector the station still calls `Available` has
   * not seen a cable, and Start would just be refused a step later.
   *
   * Once the cable is confirmed, the driver is asked "are you sure?" and
   * charging starts as soon as they say yes — there is no separate
   * «Цэнэглэлт эхлүүлэх» step.
   */
  function confirmPlugged() {
    const looksPlugged =
      chosen != null && chosen.status !== 'Available';
    if (!looksPlugged) {
      setError(t.plugNotDetected);
      return;
    }
    setError(null);
    setConfirming('start');
  }

  /** The driver said yes in the confirm dialog (with their e-barimt choice on start). */
  async function confirmYes(ebarimt?: EbarimtChoice) {
    const action = confirming;
    setConfirming(null);
    if (action === 'stop') {
      await stop();
      return;
    }
    // Mark as plugged so resolveStep moves to 'start', then fire the request.
    setPlugged(true);
    await start(ebarimt);
  }

  /** Clears the finished session so the driver can charge again. */
  function startAnother() {
    if (live.session) {
      setDismissedSessionId(live.session.transactionId);
      try {
        sessionStorage.setItem(`dismissed_session_${stationId}`, String(live.session.transactionId));
      } catch {}
    }
    setPlugged(false);
    setRequested(false);
    setConnectorId('');
    setError(null);
    void fetchWallet();
    void refresh();
  }

  /**
   * Releases the cable after the session has ended. The gun stays latched in
   * `Finishing` until the station is told to let go, and this hardware offers
   * the driver no way to do that at the unit.
   */
  async function unlock() {
    const transactionId = live.session?.transactionId;
    if (!transactionId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/app-api/sessions/${transactionId}/unlock`, { method: 'POST' });
      const payload = (await res.json().catch(() => ({}))) as {
        status?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(payload.error ?? t.unlockFailed);
      if (payload.status && payload.status !== 'Unlocked') {
        throw new Error(format(t.unlockRejected, { status: payload.status }));
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.unlockFailed);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!active) return;
    setRequested(false);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/app-api/sessions/${active.transactionId}/stop`, { method: 'POST' });
      const payload = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!res.ok) throw new Error(payload.error ?? d.start.requestFailed);
      requestSessionCheck();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : d.start.requestFailed);
    } finally {
      setBusy(false);
    }
  }

  const visibleStep = VISIBLE_STEP[step];

  /**
   * New drivers missed the next step because it changed quietly below the
   * fold. On each step change the card scrolls into view and flashes once.
   */
  const stepCardRef = useRef<HTMLDivElement>(null);
  const lastStepRef = useRef<number | null>(null);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!synced) return;
    const previous = lastStepRef.current;
    lastStepRef.current = visibleStep;
    if (previous === null || previous === visibleStep) return;
    stepCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 1600);
    return () => clearTimeout(timer);
  }, [visibleStep, synced]);

  /** A step the driver has to act on right now, not one that runs by itself. */
  const actionStep = step === 'signin' || step === 'connector' || step === 'plug';
  const offline = live.availability === 'offline' && !active;
  const steps = [t.stepSignIn, t.stepConnector, t.stepPlug, t.stepCharge];
  const chosenLabel = chosen ? connectorSummary(chosen, d, intl) : '';
  // From a QR sticker, only the gun the driver is standing at (or the one
  // their own session is running on) is shown.
  const shownId = active?.connectorId ?? session?.connectorId ?? initialConnectorId;
  const ordered = qrMode
    ? live.connectors.filter((c) => c.connectorId === shownId)
    : live.connectors;

  return (
    <div className="space-y-4">
      <Stepper steps={steps} current={visibleStep} finished={step === 'done'} label={t.title} />

      <div ref={stepCardRef} className="scroll-mt-20">
      <Card
        className={cn(
          'p-4 sm:p-5 transition-shadow',
          actionStep && !scannedBusy && 'ring-2 ring-brand/50',
          flash && 'step-flash',
        )}
      >
        <div className="space-y-4">
          {offline && (
            <Alert tone="warning" title={d.status.availability.offline} />
          )}

          {!remoteStartEnabled && !active && !offline && (
            <Alert tone="info" title={t.localOnlyTitle}>
              {t.localOnlyBody}
            </Alert>
          )}

          {step === 'signin' && !scannedBusy && (
            <StepHeading n={1} total={steps.length} title={t.stepSignIn} body={t.signInBody} />
          )}

          {step === 'signin' && !scannedBusy && (
            <GuestAuthFlow
              returnTo={returnTo}
              onSuccess={() => {
                setAuthed(true);
                setTagged(true);
                setError(null);
                void refresh();
              }}
            />
          )}

          {step === 'tag' && !scannedBusy && (
            <ActionBlock title={t.stepSignIn} body={t.tagPendingBody}>
              <ButtonLink href="/account" variant="secondary">
                {t.tagPendingCta}
              </ButtonLink>
            </ActionBlock>
          )}

          {!synced && step !== 'signin' && step !== 'tag' && (
            <StatusLine title={t.checkingConnector} pending />
          )}

          {scannedBusy && (
            <div className="space-y-4">
              <Alert
                tone="warning"
                title={format(t.scannedInUseTitle, {
                  id: connectorLetter(initialConnectorId ?? 0),
                })}
              >
                {t.scannedInUseBody}
              </Alert>
              <ConnectorPicker connectors={ordered} free={free} scannedId={initialConnectorId} />
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t.freeToScanTitle}</h3>
                {otherFree.length > 0 && !offline ? (
                  <ConnectorPicker className="mt-2" connectors={otherFree} free={otherFree} />
                ) : (
                  <p className="mt-1 text-sm text-muted">{t.noneFreeToScan}</p>
                )}
              </div>
            </div>
          )}

          {!qrMode && synced && step === 'connector' && (
            <div>
              <StepHeading
                n={2}
                total={steps.length}
                title={t.stepConnector}
                body={free.length === 0 && !offline ? t.connectorBusy : t.connectorBody}
              />
              {scannedUnavailable && free.length > 0 && (
                <p className="mt-2 text-sm font-medium text-warning">{t.scannedUnavailable}</p>
              )}
              <ConnectorPicker
                className="mt-4"
                connectors={ordered}
                free={free}
                selectedId={chosen?.connectorId}
                scannedId={initialConnectorId}
                onChoose={requireQr}
                disabled={offline}
              />
            </div>
          )}

          {step === 'plug' && synced && (
            <div className="space-y-4">
              <StepHeading n={3} total={steps.length} title={t.stepPlug} body={chosenLabel || undefined} />
              <PlugGuide items={[t.plugStep1, t.plugStep2, t.plugStep3]} />
              <Button
                type="button"
                size="lg"
                className="step-glow w-full text-base font-bold"
                onClick={confirmPlugged}
                disabled={offline}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
                  <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
                </svg>
                {t.plugConfirm}
              </Button>
              {!qrMode && (
                <div className="flex justify-center">
                  <Button type="button" variant="ghost" size="sm" onClick={chooseAnother}>
                    {t.changeConnector}
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 'start' && synced && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-foreground">{t.stepCharge}</h2>
                  {chosenLabel && (
                    <p className="mt-0.5 text-xs text-muted">{chosenLabel}</p>
                  )}
                </div>
                {isInternal ? (
                  <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs">
                    <span>Дотоод хэрэглэгч · Үнэ төлбөргүй</span>
                  </div>
                ) : walletBalance !== null && (
                  <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 rounded-xl sm:rounded-full border border-border/60 bg-surface-muted/60 px-2.5 sm:px-3 py-1 text-xs shadow-xs max-w-full">
                    <span className="text-muted">Хэтэвчний үлдэгдэл:</span>
                    <span
                      className={
                        requireBalanceToStart && walletBalance < minStartBalance
                          ? 'font-bold text-amber-500'
                          : 'font-bold text-foreground'
                      }
                    >
                      {walletBalance.toLocaleString('mn-MN')}₮
                    </span>
                    {requireBalanceToStart && walletBalance < minStartBalance && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        (Доод тал нь {minStartBalance.toLocaleString('mn-MN')}₮)
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Connector confirmed — auto-starting. Show spinner while request is in flight. */}
              {busy && (
                <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted">
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4l-3 3 3 3H4z" />
                  </svg>
                  <span>{t.starting}</span>
                </div>
              )}

              {/* Shown when balance is too low — lets the driver top up inline. */}
              {!busy && requireBalanceToStart && walletBalance !== null && walletBalance < minStartBalance && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    className="h-11 sm:h-12 w-full px-3 sm:px-4 text-xs sm:text-sm font-semibold justify-center text-center"
                    onClick={() => setConfirming('start')}
                    loading={busy}
                    disabled={offline}
                  >
                    {t.startNow}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 sm:h-12 w-full px-3 sm:px-4 text-xs sm:text-sm font-semibold justify-center text-center"
                    onClick={() => setShowQuickPay(true)}
                    disabled={busy}
                  >
                    Хэтэвч цэнэглэх (QPay)
                  </Button>
                </div>
              )}

              {!qrMode && (
                <div className="flex justify-end pt-0.5">
                  <Button type="button" variant="ghost" size="sm" onClick={chooseAnother} disabled={busy}>
                    {t.changeConnector}
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 'preparing' && <StatusLine title={t.waitingTitle} body={t.waitingBody} pending />}

          {step === 'charging' && active && (
            <div className="space-y-4">
              <StatusLine title={t.chargingTitle} pending />
              <LiveReadout session={active} intl={intl} tariffPerKwh={live.tariffPerKwh} />
              <TariffPanel
                session={active}
                stationRate={live.tariffPerKwh}
                defaultRate={live.defaultTariffPerKwh}
                zones={live.tariffZones}
                intl={intl}
              />
              <Button
                type="button"
                variant="danger"
                size="lg"
                className="w-full"
                onClick={() => setConfirming('stop')}
                loading={busy}
                aria-label={t.stopNow}
              >
                {!busy && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                )}
                {t.stopButton}
              </Button>
            </div>
          )}

          {step === 'stopping' && <StatusLine title={t.stoppingTitle} body={t.stoppingBody} pending />}

          {step === 'done' && session && (
            <div className="space-y-4">
              <StatusLine title={t.doneTitle} body={t.doneBody} />
              <SessionSummary session={session} intl={intl} />
              <AutoEbarimtStatus session={session} />
              {Boolean(session.ebarimt && (session.ebarimt.receiptId || session.ebarimt.lottery)) && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <span className="font-semibold text-brand-strong">✓ {t.ebarimtIssued}</span>
                  {session.ebarimt?.type === 'B2B_RECEIPT' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      🏢 Байгууллага ({session.ebarimt.customerTin})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted border border-border px-2.5 py-0.5 text-xs font-medium text-muted">
                      👤 Хувь хүн
                    </span>
                  )}
                  {session.ebarimt?.lottery && (
                    <span className="font-mono text-xs text-muted">
                      {format(d.account.ebarimt.lotteryLabel, { id: session.ebarimt.lottery })}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void unlock()} loading={busy}>
                  {t.unlockNow}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEbarimtModalInitialType(
                      session.ebarimt?.type ?? session.ebarimtRequest?.type ?? 'B2C_RECEIPT',
                    );
                    setShowEbarimtModal(true);
                  }}
                >
                  {session.ebarimt && (session.ebarimt.receiptId || session.ebarimt.lottery)
                    ? d.account.ebarimt.viewButton
                    : t.ebarimtGet}
                </Button>
                <Link
                  href="/account/sessions"
                  className="inline-flex h-9 items-center px-2 text-sm font-semibold text-brand hover:underline"
                >
                  {t.viewReceipt}
                </Link>
                <Button type="button" size="sm" onClick={startAnother}>
                  {t.startAnother}
                </Button>
              </div>
            </div>
          )}

          {staleFeed && <p className="text-xs text-warning">{t.refreshFailed}</p>}

        </div>
      </Card>
      </div>

      {step !== 'connector' && !scannedBusy && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">{t.gunsTitle}</h2>
          </div>
          <ConnectorPicker
            className="mt-4"
            connectors={ordered}
            free={free}
            selectedId={chosen?.connectorId ?? active?.connectorId}
            scannedId={initialConnectorId}
            onChoose={!qrMode && !active && !busy ? requireQr : undefined}
            onStart={
              qrMode && authed && tagged && !active && !busy && !offline ? promptStart : undefined
            }
          />
        </Card>
      )}

      {showEbarimtModal && session && (
        <EbarimtModal
          session={session}
          initialType={ebarimtModalInitialType}
          onClose={() => setShowEbarimtModal(false)}
          onSuccess={(updatedSession) => {
            setLive((prev) => ({ ...prev, session: updatedSession }));
          }}
        />
      )}

      {pendingConfirm === 'stop' && (
        <ConfirmDialog
          tone="danger"
          title={t.confirmStopTitle}
          body={t.confirmStopBody}
          yesLabel={t.confirmStopYes}
          noLabel={t.confirmKeep}
          onYes={() => void confirmYes()}
          onNo={() => setConfirming(null)}
        />
      )}

      {pendingConfirm === 'start' && (
        <StartDialog
          body={format(t.confirmStartBody, { connector: chosenLabel })}
          // Internal users charge free, so there is nothing to receipt.
          askEbarimt={!isInternal}
          onYes={(choice) => void confirmYes(choice)}
          onNo={() => setConfirming(null)}
        />
      )}

      <QuickPayModal
        open={showQuickPay}
        onClose={() => setShowQuickPay(false)}
        onSuccess={(newBalance) => {
          setWalletBalance(newBalance);
          setShowQuickPay(false);
          setError(null);
          void refresh();
        }}
      />
    </div>
  );
}

/** An empty connector list is a hiccup in the feed, not a station without guns. */
function mergeLive(prev: LiveState, next: LiveState): LiveState {
  return { ...next, connectors: next.connectors?.length ? next.connectors : prev.connectors };
}

function resolveStep(input: {
  signedIn: boolean;
  hasIdTag: boolean;
  plugged: boolean;
  requested: boolean;
  session: ChargingSession | null;
  sessionConnector: StationConnector | undefined;
  /** A free gun has been chosen, by the driver or by a scanned sticker. */
  hasConnector: boolean;
}): FlowStep {
  const { session, sessionConnector } = input;

  if (session?.status === 'Active') {
    if (sessionConnector?.status === 'Finishing') return 'stopping';
    if (sessionConnector?.status === 'Preparing') return 'preparing';
    return 'charging';
  }

  if (!input.signedIn) return 'signin';
  if (!input.hasIdTag) return 'tag';

  if (session) return 'done';

  if (input.requested) return 'preparing';
  // The station refuses a start that does not name a gun, so the driver must
  // choose one before the start button is offered at all.
  if (!input.hasConnector) return 'connector';
  if (!input.plugged) return 'plug';
  return 'start';
}

function connectorSummary(
  c: StationConnector,
  d: ReturnType<typeof useI18n>['d'],
  intl: string,
): string {
  return [
    format(d.start.connectorOption, { id: connectorLetter(c.connectorId) }),
    c.label,
    c.type,
    c.powerKw ? formatPowerKw(c.powerKw, intl) : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

function Stepper({
  steps,
  current,
  finished,
  label,
}: {
  steps: string[];
  current: number;
  finished: boolean;
  label: string;
}) {
  // Every step is labelled on phones too: new drivers scanning a sticker
  // need to see the whole path, not only a thin progress bar.
  return (
    <ol
      aria-label={label}
      className="grid grid-cols-4 rounded-2xl bg-surface p-3 ring-1 ring-border shadow-[var(--shadow-card)]"
    >
      {steps.map((title, index) => {
        const state =
          finished || index < current ? 'done' : index === current ? 'current' : 'todo';
        return (
          <li
            key={title}
            aria-current={state === 'current' ? 'step' : undefined}
            className="relative flex min-w-0 flex-col items-center text-center"
          >
            {/* Line to the next step, drawn behind the circles. */}
            {index < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'absolute left-1/2 top-[18px] h-1 w-full -translate-y-1/2 rounded-full',
                  finished || index < current ? 'bg-brand' : 'bg-surface-muted ring-1 ring-border',
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative grid size-9 place-items-center rounded-full text-sm font-bold transition-transform',
                state === 'todo'
                  ? 'bg-surface-muted text-muted ring-1 ring-border'
                  : state === 'current'
                    ? 'step-glow scale-110 bg-brand text-brand-contrast ring-4 ring-brand/25'
                    : 'bg-brand text-brand-contrast',
              )}
            >
              {state === 'done' ? '✓' : index + 1}
            </span>
            <span
              className={cn(
                'mt-2 line-clamp-2 px-0.5 text-[11px] leading-tight sm:text-xs',
                state === 'current'
                  ? 'font-bold text-brand-strong'
                  : state === 'done'
                    ? 'font-semibold text-foreground'
                    : 'text-muted',
              )}
            >
              {title}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** "Step 2 of 4 · do this now" — the one thing the driver should do next. */
function StepHeading({
  n,
  total,
  title,
  body,
}: {
  n: number;
  total: number;
  title: string;
  body?: string;
}) {
  const { d } = useI18n();
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="step-glow grid size-11 shrink-0 place-items-center rounded-full bg-brand text-lg font-extrabold text-brand-contrast"
      >
        {n}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-strong">
          {format(d.flow.stepOf, { n, total })} · {d.flow.nextStepHint}
        </p>
        <h2 className="text-lg font-bold leading-tight text-foreground">{title}</h2>
        {body && <p className="mt-1 text-sm leading-6 text-muted">{body}</p>}
      </div>
    </div>
  );
}

/** Picture plus numbered how-to for plugging in, so nobody presses Charge first. */
function PlugGuide({ items }: { items: string[] }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-brand-soft/60 p-4 ring-1 ring-brand/25">
      <div aria-hidden className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-surface text-brand ring-1 ring-brand/30">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 2v5M15 2v5" />
          <path d="M6 7h12v3a6 6 0 0 1-12 0V7Z" />
          <path d="M12 16v6" />
        </svg>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 animate-bounce text-lg text-brand">↓</span>
      </div>
      <ol className="min-w-0 space-y-1.5">
        {items.map((item, i) => (
          <li key={item} className="flex gap-2 text-sm leading-5 text-foreground">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-bold text-brand-contrast">
              {i + 1}
            </span>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const EBARIMT_CHOICE_KEY = 'ebarimt_choice';

function readSavedChoice(): EbarimtChoice | null {
  try {
    const raw = localStorage.getItem(EBARIMT_CHOICE_KEY);
    const parsed = raw ? (JSON.parse(raw) as EbarimtChoice) : null;
    return parsed?.type === 'B2B_RECEIPT' || parsed?.type === 'B2C_RECEIPT' ? parsed : null;
  } catch {
    return null;
  }
}

function saveChoice(choice: EbarimtChoice) {
  try {
    localStorage.setItem(EBARIMT_CHOICE_KEY, JSON.stringify(choice));
  } catch {}
}

interface OrgCheck {
  valid?: boolean;
  name?: string;
  tin?: string;
  error?: string;
}

/**
 * "Start charging?" — and which e-barimt the driver wants: personal or a
 * company. The choice goes with the start request and the receipt is issued
 * automatically, for the billed amount, when the charge ends.
 */
function StartDialog({
  body,
  askEbarimt,
  onYes,
  onNo,
}: {
  body: string;
  askEbarimt: boolean;
  onYes: (choice?: EbarimtChoice) => void;
  onNo: () => void;
}) {
  const { d } = useI18n();
  const t = d.flow;
  const [saved] = useState(readSavedChoice);
  const [type, setType] = useState<EbarimtChoice['type']>(saved?.type ?? 'B2C_RECEIPT');
  const [tin, setTin] = useState(saved?.type === 'B2B_RECEIPT' ? (saved.customerTin ?? '') : '');
  /** The last lookup, tagged with the number it was for. */
  const [lookup, setLookup] = useState<{ query: string; result: OrgCheck } | null>(null);
  const clean = tin.trim();
  const wantLookup = askEbarimt && type === 'B2B_RECEIPT' && clean.length >= 5;
  const org = wantLookup && lookup?.query === clean ? lookup.result : null;
  const checking = wantLookup && !org;

  // Live lookup of the company, so the driver sees its name before starting.
  useEffect(() => {
    if (!wantLookup) return;
    let alive = true;
    const timer = setTimeout(async () => {
      let result: OrgCheck;
      try {
        const res = await fetch(`/app-api/sessions/ebarimt/check-org/${encodeURIComponent(clean)}`);
        const data = (await res.json().catch(() => null)) as { result?: OrgCheck; error?: string } | null;
        result = res.ok && data?.result ? data.result : { valid: false, error: data?.error };
      } catch {
        result = { valid: false };
      }
      if (alive) setLookup({ query: clean, result });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [wantLookup, clean]);

  const orgOk = type === 'B2C_RECEIPT' || (clean.length >= 5 && !checking && Boolean(org?.valid));

  function confirm() {
    if (!askEbarimt) return onYes(undefined);
    if (!orgOk) return;
    const choice: EbarimtChoice =
      type === 'B2B_RECEIPT'
        ? { type, customerTin: org?.tin || clean, customerName: org?.name }
        : { type };
    saveChoice(choice);
    onYes(choice);
  }

  const option = (value: EbarimtChoice['type'], icon: string, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={type === value}
      onClick={() => setType(value)}
      className={cn(
        'flex h-14 items-center justify-center gap-2 rounded-xl text-sm font-bold ring-1 transition',
        type === value
          ? 'bg-brand-soft text-brand-strong ring-2 ring-brand'
          : 'bg-surface-muted/50 text-foreground ring-border hover:ring-brand/40',
      )}
    >
      <span aria-hidden className="text-lg">{icon}</span>
      {label}
    </button>
  );

  return (
    <Modal onClose={onNo} maxWidth="sm">
      <div className="px-6 pt-6 pb-4 text-center">
        <span aria-hidden className="mx-auto grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
          <svg viewBox="0 0 24 24" fill="currentColor" className="size-7">
            <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
          </svg>
        </span>
        <h3 className="mt-4 text-lg font-bold text-foreground">{t.confirmStartTitle}</h3>
        <p className="mt-1.5 text-sm leading-6 text-muted">{body}</p>
      </div>

      {askEbarimt && (
        <div className="space-y-3 border-t border-border px-6 py-4">
          <p className="text-sm font-semibold text-foreground">{t.ebarimtTitle}</p>
          <div role="radiogroup" aria-label={t.ebarimtTitle} className="grid grid-cols-2 gap-2">
            {option('B2C_RECEIPT', '👤', t.ebarimtPersonal)}
            {option('B2B_RECEIPT', '🏢', t.ebarimtOrg)}
          </div>
          {type === 'B2B_RECEIPT' && (
            <div className="space-y-1.5">
              <label htmlFor="start-ebarimt-tin" className="block text-xs font-medium text-muted">
                {t.ebarimtOrgLabel}
              </label>
              <Input
                id="start-ebarimt-tin"
                inputMode="numeric"
                autoComplete="off"
                value={tin}
                placeholder={t.ebarimtOrgPlaceholder}
                onChange={(e) => setTin(e.target.value.replace(/\s/g, ''))}
              />
              {checking ? (
                <p className="text-xs text-muted">{t.ebarimtOrgChecking}</p>
              ) : org?.valid ? (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ {org.name || org.tin || clean}
                </p>
              ) : org ? (
                <p className="text-xs font-medium text-danger">{org.error || t.ebarimtOrgInvalid}</p>
              ) : null}
            </div>
          )}
          <p className="text-xs leading-5 text-muted">{t.ebarimtAutoNote}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="danger" size="lg" onClick={onNo}>
          {t.confirmCancel}
        </Button>
        <Button type="button" size="lg" onClick={confirm} disabled={!orgOk} autoFocus>
          {t.confirmStartYes}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * After the charge: the receipt chosen at start is being issued in the
 * background. Shown until it lands; after two minutes without it, the
 * driver is told to get it by hand.
 */
function AutoEbarimtStatus({ session }: { session: ChargingSession }) {
  const { d } = useI18n();
  const t = d.flow;
  const request = session.ebarimtRequest;
  const issued = Boolean(session.ebarimt?.receiptId || session.ebarimt?.lottery);

  // Flips once two minutes have passed since the charge ended.
  const [late, setLate] = useState(false);
  const stoppedAt = session.stopTimestamp;
  useEffect(() => {
    if (!stoppedAt) return;
    const remaining = new Date(stoppedAt).getTime() + 2 * 60 * 1000 - Date.now();
    const timer = setTimeout(() => setLate(true), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [stoppedAt]);

  if (!request || issued || !(session.cost && session.cost > 0)) return null;

  if (late || session.ebarimt?.status === 'FAILED') {
    return <p className="text-sm font-medium text-warning">{t.ebarimtFailed}</p>;
  }

  const who =
    request.type === 'B2B_RECEIPT'
      ? `🏢 ${t.ebarimtOrg} · ${request.customerName || request.customerTin || ''}`
      : `👤 ${t.ebarimtPersonal}`;
  return <StatusLine title={t.ebarimtPending} body={who} pending />;
}

function ActionBlock({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

/** "Are you sure?" before starting or stopping — big buttons for a touch screen. */
function ConfirmDialog({
  tone,
  title,
  body,
  yesLabel,
  noLabel,
  onYes,
  onNo,
}: {
  tone: 'primary' | 'danger';
  title: string;
  body: string;
  yesLabel: string;
  noLabel: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <Modal onClose={onNo} maxWidth="sm">
      <div className="px-6 pt-6 pb-5 text-center">
        <span
          aria-hidden
          className={cn(
            'mx-auto grid size-14 place-items-center rounded-full',
            tone === 'danger' ? 'bg-danger/10 text-danger' : 'bg-brand-soft text-brand',
          )}
        >
          {tone === 'danger' ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="size-7">
              <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
            </svg>
          )}
        </span>
        <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-muted">{body}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border px-6 py-4">
        {/* On the start dialog «No» is «Цуцлах» — red like every cancel. On
            the stop dialog it is «keep charging», which must not look like a
            second stop button. */}
        <Button type="button" variant={tone === 'danger' ? 'secondary' : 'danger'} size="lg" onClick={onNo}>
          {noLabel}
        </Button>
        <Button type="button" variant={tone} size="lg" onClick={onYes} autoFocus>
          {yesLabel}
        </Button>
      </div>
    </Modal>
  );
}

function StatusLine({ title, body, pending = false }: { title: string; body?: string; pending?: boolean }) {
  return (
    <div className={cn('flex gap-3', body ? 'items-start' : 'items-center')}>
      <span
        aria-hidden
        className={cn(
          'size-3 shrink-0 rounded-full bg-brand',
          body && 'mt-1',
          pending && 'animate-pulse',
        )}
      />
      <div className="min-w-0" role="status">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {body && <p className="mt-1 text-sm leading-6 text-muted">{body}</p>}
      </div>
    </div>
  );
}

/**
 * The station's guns, one row each with type, power and status.
 *
 * With `onChoose` it is the picker: free guns are buttons and choosing one
 * moves the flow on. Without it, it is a read-only status list.
 */
function ConnectorPicker({
  connectors,
  free,
  selectedId,
  scannedId,
  onChoose,
  onStart,
  disabled = false,
  className,
}: {
  connectors: StationConnector[];
  free: StationConnector[];
  selectedId?: number;
  scannedId?: number;
  onChoose?: (id: number) => void;
  /** Tap on a free gun that is `Preparing` (cable already in): ask to start. */
  onStart?: (id: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { d, locale } = useI18n();
  const intl = intlLocale(locale);

  if (connectors.length === 0) {
    return <p className={cn('text-sm text-muted', className)}>{d.stations.noConnectors}</p>;
  }

  return (
    <ul className={cn('space-y-2', className)} role={onChoose ? 'radiogroup' : undefined} aria-label={d.flow.gunsTitle}>
      {connectors.map((c) => {
        const isFree = free.some((f) => f.connectorId === c.connectorId);
        const startable = Boolean(onStart) && isFree && !disabled && c.status === 'Preparing';
        const selectable = (Boolean(onChoose) && isFree && !disabled) || startable;
        const handleTap = startable ? onStart : onChoose;
        const selected = c.connectorId === selectedId;
        // Live readings outlive the session that produced them, so they are
        // shown only while a transaction is actually running on the gun.
        const live = LIVE_STATUSES.has(c.status) && Boolean(c.currentTransactionId);
        const faultCode =
          c.status === 'Faulted' && c.errorCode && c.errorCode !== 'NoError' ? c.errorCode : undefined;

        const content = (
          <>
            <span
              aria-hidden
              className={cn(
                'grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold',
                selected ? 'bg-brand text-brand-contrast' : 'bg-surface-muted text-foreground',
              )}
            >
              {connectorLetter(c.connectorId)}
            </span>
            <span className="min-w-0 flex-1">
              {c.connectorId === scannedId && (
                <span className="block text-xs font-semibold text-brand-strong">
                  {d.stations.scannedConnector}
                </span>
              )}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  <span className="sr-only">
                    {format(d.stations.connectorN, { id: connectorLetter(c.connectorId) })}
                  </span>
                  {c.type ?? d.stations.plugTypeMissing}
                  {c.powerKw ? ` · ${formatPowerKw(c.powerKw, intl)}` : ''}
                </span>
                {c.label && (
                  <span className="inline-flex items-center rounded-md bg-brand/10 px-1.5 py-0.5 text-xs font-semibold text-brand ring-1 ring-inset ring-brand/25">
                    {c.label}
                  </span>
                )}
              </div>
              {(live || c.availability === 'Inoperative' || faultCode) && (
                <span className="mt-0.5 block text-xs text-muted">
                  {live && c.lastPowerW !== undefined &&
                    format(d.stations.nowPower, { power: formatPower(c.lastPowerW, intl) })}
                  {live && c.lastSocPercent !== undefined &&
                    ` · ${format(d.stations.battery, { percent: Math.round(c.lastSocPercent) })}`}
                  {c.availability === 'Inoperative' && d.stations.outOfService}
                  {faultCode && ` · ${faultCode}`}
                </span>
              )}
            </span>
            {/* Someone scanned this gun and is about to start: the station
                still reports it Available, but it is not free. */}
            {c.inUseByOther && (c.status === 'Available' || c.status === 'Preparing') ? (
              <Badge tone={connectorStatusTone('Reserved')} className="shrink-0">
                {d.stations.inUseByOther}
              </Badge>
            ) : (
              <Badge tone={connectorStatusTone(c.status)} className="shrink-0">
                {connectorStatusLabel(c.status, locale)}
              </Badge>
            )}
            {selectable && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-muted" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
              </svg>
            )}
          </>
        );

        const rowClass = cn(
          'flex w-full items-center gap-2 sm:gap-3 rounded-xl p-2.5 sm:p-3 text-left ring-1 transition',
          selected ? 'bg-brand-soft ring-brand/40' : 'bg-surface-muted/40 ring-border',
        );

        return (
          <li key={c.connectorId}>
            {handleTap ? (
              <button
                type="button"
                role={onChoose ? 'radio' : undefined}
                aria-checked={onChoose ? selected : undefined}
                disabled={!selectable}
                onClick={() => handleTap(c.connectorId)}
                className={cn(
                  rowClass,
                  selectable
                    ? 'cursor-pointer hover:bg-brand-soft hover:ring-brand/40 focus-visible:outline-2 focus-visible:outline-brand'
                    : 'cursor-not-allowed opacity-60',
                )}
              >
                {content}
              </button>
            ) : (
              <div className={rowClass}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LiveReadout({
  session,
  intl,
  tariffPerKwh,
}: {
  session: ChargingSession;
  intl: string;
  /** Fee-inclusive price per kWh, as the driver pays it. */
  tariffPerKwh?: number;
}) {
  const { d } = useI18n();
  const t = d.flow;
  // The backend prices a session when it ends; until then show the running
  // estimate at the price the driver pays.
  const estimate =
    session.cost == null && tariffPerKwh != null
      ? Math.round(session.energyKwh * tariffPerKwh)
      : undefined;

  // Only stations that report battery % get an estimate.
  const toFull = session.minutesToFull;
  const toFullText =
    toFull == null
      ? undefined
      : toFull <= 1
        ? t.toFullDone
        : toFull < 60
          ? format(t.toFullMinutes, { minutes: toFull })
          : format(t.toFullHours, { hours: Math.floor(toFull / 60), minutes: toFull % 60 });

  return (
    <div className="space-y-2.5">
      {toFullText && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand ring-1 ring-brand/25">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 7v5l3 2" />
          </svg>
          {toFullText}
        </p>
      )}
    <dl className="grid grid-cols-2 gap-2.5 sm:gap-3 rounded-2xl bg-surface-muted/60 p-3 sm:p-4 ring-1 ring-border sm:grid-cols-3">
      <Metric label={t.liveEnergy} value={formatKwh(session.energyKwh, intl)} strong />
      <Metric label={t.livePower} value={formatPower(session.lastPowerW, intl)} strong />
      <Metric
        label={t.liveBattery}
        value={session.lastSocPercent != null ? `${session.lastSocPercent}%` : '—'}
      />
      <Metric label={t.liveElapsed} value={formatDuration(session.startTimestamp, undefined, intl)} />
      <Metric
        label={t.liveCost}
        value={estimate != null ? `≈ ${formatMoney(estimate, intl)}` : formatMoney(session.cost, intl)}
      />
    </dl>
    </div>
  );
}

function clock(minute: number): string {
  return `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

/** Minutes since midnight in Mongolia (UTC+8, no DST) — the zones' own clock. */
function mnMinuteNow(): number {
  const now = new Date();
  return (now.getUTCHours() * 60 + now.getUTCMinutes() + 8 * 60) % 1440;
}

/**
 * While charging: the rate this driver is being billed at right now, and the
 * station's whole price list — every time-of-day zone, with the one in effect
 * marked — so a cheaper night rate is never a surprise on the receipt.
 */
function TariffPanel({
  session,
  stationRate,
  defaultRate,
  zones,
  intl,
}: {
  session: ChargingSession;
  stationRate?: number;
  defaultRate?: number;
  zones?: TariffZone[];
  intl: string;
}) {
  const { d } = useI18n();
  const t = d.flow.tariff;
  const yourRate = session.tariffPerKwh ?? stationRate;
  const nowMinute = mnMinuteNow();
  const inZone = zones?.find((z) => nowMinute >= z.startMinute && nowMinute < z.endMinute);
  const perKwh = (n?: number) => formatTariff(n, intl);

  if (yourRate == null && stationRate == null && !zones?.length) return null;

  return (
    <div className="rounded-2xl ring-1 ring-border">
      {/* What this driver pays */}
      <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-brand/10 px-3.5 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted">{t.yours}</p>
          {session.tariffZoneName && (
            <p className="mt-0.5 truncate text-xs font-semibold text-brand-strong">{session.tariffZoneName}</p>
          )}
        </div>
        {session.isInternal ? (
          <span className="text-right text-sm font-bold text-brand">{t.free}</span>
        ) : (
          <span className="shrink-0 text-base font-bold tabular-nums text-brand">{perKwh(yourRate)}</span>
        )}
      </div>

      {/* The station's price list */}
      <div className="px-3.5 py-3">
        <p className="text-[11px] font-medium text-muted">{t.station}</p>
        {zones?.length ? (
          <ul className="mt-1.5 space-y-1">
            {zones.map((z) => {
              const current = z === inZone;
              return (
                <li
                  key={`${z.startMinute}-${z.endMinute}`}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs',
                    current ? 'bg-surface-muted font-semibold text-foreground ring-1 ring-brand/30' : 'text-muted',
                  )}
                >
                  <span className="min-w-0 truncate">
                    <span className="tabular-nums">
                      {clock(z.startMinute)}–{clock(z.endMinute)}
                    </span>
                    {z.name && <span> · {z.name}</span>}
                    {current && <span className="ml-1.5 text-brand">● {t.now}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums">{perKwh(z.tariffPerKwh)}</span>
                </li>
              );
            })}
            {defaultRate != null && (
              <li
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs',
                  !inZone ? 'bg-surface-muted font-semibold text-foreground ring-1 ring-brand/30' : 'text-muted',
                )}
              >
                <span>
                  {t.otherHours}
                  {!inZone && <span className="ml-1.5 text-brand">● {t.now}</span>}
                </span>
                <span className="shrink-0 tabular-nums">{perKwh(defaultRate)}</span>
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
            {perKwh(stationRate ?? defaultRate)}
          </p>
        )}
      </div>
    </div>
  );
}

/** Energy, cost and — when a service fee applied — its breakdown. */
function SessionSummary({ session, intl }: { session: ChargingSession; intl: string }) {
  const { d } = useI18n();
  const t = d.account.sessions;
  const hasFee = session.feeAmount != null && session.feeAmount > 0;

  return (
    <dl className="max-w-sm space-y-1 rounded-xl bg-surface-muted/60 p-3 text-sm ring-1 ring-border">
      <div className="flex justify-between gap-4">
        <dt className="text-muted">{d.flow.liveEnergy}</dt>
        <dd className="font-semibold text-foreground">{formatKwh(session.energyKwh, intl)}</dd>
      </div>
      {hasFee && (
        <>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t.energyCost}</dt>
            <dd className="font-semibold text-foreground">{formatMoney(session.energyCost, intl)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{format(t.serviceFee, { percent: session.feePercent ?? '—' })}</dt>
            <dd className="font-semibold text-foreground">{formatMoney(session.feeAmount, intl)}</dd>
          </div>
        </>
      )}
      <div className={cn('flex justify-between gap-4', hasFee && 'border-t border-border/50 pt-1')}>
        <dt className="text-muted">{t.total}</dt>
        <dd className="font-bold text-foreground">{formatMoney(session.cost, intl)}</dd>
      </div>
    </dl>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted truncate">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 text-foreground truncate',
          strong ? 'text-base sm:text-lg font-bold' : 'text-xs sm:text-sm font-semibold',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
