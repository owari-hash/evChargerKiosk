'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { format, useI18n } from '@/components/i18n-provider';
import { Alert, Badge, Button, ButtonLink, Card, Modal } from '@/components/ui';
import { EbarimtModal } from '@/components/account/ebarimt-modal';
import { GuestAuthFlow } from './guest-auth-flow';
import { QuickPayModal } from './quick-pay-modal';
import {
  noteStartRequested,
  registerChargingFlow,
  requestSessionCheck,
  showSessionOnScreen,
} from '@/lib/session-events';
import type { ChargingSession, StationAvailability, StationConnector } from '@/lib/types';
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
  intlLocale,
} from '@/lib/utils';
import { useToastMessage } from '@/lib/use-toast-message';

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
  /** In QR mode, nothing is offered until the first live read says who has the gun. */
  const [synced, setSynced] = useState(!qrMode);
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
  useEffect(() => {
    holdRef.current = shouldHold;
  }, [shouldHold]);

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
    if (!qrMode) return;
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

  function choose(id: number) {
    setConnectorId(String(id));
    setPlugged(false);
    setError(null);
  }

  function chooseAnother() {
    setConnectorId('');
    setPlugged(false);
    setError(null);
  }

  async function start() {
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
        body: JSON.stringify({ connectorId: chosen.connectorId }),
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

  /** The driver said yes in the confirm dialog. */
  async function confirmYes() {
    const action = confirming;
    setConfirming(null);
    if (action === 'stop') {
      await stop();
      return;
    }
    // Mark as plugged so resolveStep moves to 'start', then fire the request.
    setPlugged(true);
    await start();
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

      <Card className="p-4 sm:p-5">
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

          {qrMode && !synced && step !== 'signin' && step !== 'tag' && (
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

          {!qrMode && step === 'connector' && (
            <div>
              <h2 className="text-base font-semibold text-foreground">{t.stepConnector}</h2>
              <p className="mt-1 text-sm text-muted">
                {free.length === 0 && !offline ? t.connectorBusy : t.connectorBody}
              </p>
              {scannedUnavailable && free.length > 0 && (
                <p className="mt-2 text-sm font-medium text-warning">{t.scannedUnavailable}</p>
              )}
              <ConnectorPicker
                className="mt-4"
                connectors={ordered}
                free={free}
                selectedId={chosen?.connectorId}
                scannedId={initialConnectorId}
                onChoose={choose}
                onStart={promptStart}
                disabled={offline}
              />
            </div>
          )}

          {step === 'plug' && synced && (
            <ActionBlock
              title={t.stepPlug}
              body={chosenLabel ? `${chosenLabel} — ${t.plugBody}` : t.plugBody}
            >
              <Button type="button" onClick={confirmPlugged}>
                {t.plugConfirm}
              </Button>
              {!qrMode && (
                <Button type="button" variant="ghost" onClick={chooseAnother}>
                  {t.changeConnector}
                </Button>
              )}
            </ActionBlock>
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
              {session.ebarimt && (
                <p className="text-sm text-foreground">
                  <span className="font-semibold text-brand-strong">✓ {t.ebarimtIssued}</span>
                  {session.ebarimt.lottery && (
                    <span className="ml-2 font-mono text-xs text-muted">
                      {format(d.account.ebarimt.lotteryLabel, { id: session.ebarimt.lottery })}
                    </span>
                  )}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => void unlock()} loading={busy}>
                  {t.unlockNow}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowEbarimtModal(true)}>
                  {session.ebarimt ? d.account.ebarimt.viewButton : t.ebarimtGet}
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

      {step !== 'connector' && !scannedBusy && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">{t.gunsTitle}</h2>
            {!qrMode && !active && free.length > 1 && (
              <span className="text-xs text-muted">Хошуу дээр дарж сонгох боломжтой</span>
            )}
          </div>
          <ConnectorPicker
            className="mt-4"
            connectors={ordered}
            free={free}
            selectedId={chosen?.connectorId ?? active?.connectorId}
            scannedId={initialConnectorId}
            onChoose={!qrMode && !active && !busy ? choose : undefined}
            onStart={authed && tagged && !active && !busy && !offline ? promptStart : undefined}
          />
        </Card>
      )}

      {showEbarimtModal && session && (
        <EbarimtModal
          session={session}
          onClose={() => setShowEbarimtModal(false)}
          onSuccess={(updatedSession) => {
            setLive((prev) => ({ ...prev, session: updatedSession }));
          }}
        />
      )}

      {pendingConfirm && (
        <ConfirmDialog
          tone={pendingConfirm === 'stop' ? 'danger' : 'primary'}
          title={pendingConfirm === 'stop' ? t.confirmStopTitle : t.confirmStartTitle}
          body={
            pendingConfirm === 'stop'
              ? t.confirmStopBody
              : format(t.confirmStartBody, { connector: chosenLabel })
          }
          yesLabel={pendingConfirm === 'stop' ? t.confirmStopYes : t.confirmStartYes}
          noLabel={pendingConfirm === 'stop' ? t.confirmKeep : t.confirmCancel}
          onYes={() => void confirmYes()}
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
  return (
    <div className="space-y-1.5 sm:space-y-0">
      <ol aria-label={label} className="grid grid-cols-4 gap-1 sm:gap-1.5">
        {steps.map((title, index) => {
          const state =
            finished || index < current ? 'done' : index === current ? 'current' : 'todo';
          return (
            <li
              key={title}
              aria-current={state === 'current' ? 'step' : undefined}
              className="min-w-0"
            >
              <div
                className={cn(
                  'h-1.5 rounded-full',
                  state === 'todo'
                    ? 'bg-surface-muted ring-1 ring-border'
                    : state === 'current'
                      ? 'step-glow bg-brand'
                      : 'bg-brand',
                )}
              />
              <p
                className={cn(
                  'mt-1.5 hidden sm:flex items-start gap-1 sm:mt-2 sm:gap-1.5 sm:text-xs md:text-sm sm:leading-4',
                  state === 'todo' ? 'text-muted' : 'font-semibold text-foreground',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-3.5 shrink-0 place-items-center rounded-full text-[9px] font-bold sm:size-5 sm:text-[11px]',
                    state === 'todo'
                      ? 'bg-surface-muted text-muted ring-1 ring-border'
                      : state === 'current'
                        ? 'step-glow bg-brand text-brand-contrast'
                        : 'bg-brand text-brand-contrast',
                  )}
                >
                  {state === 'done' ? '✓' : index + 1}
                </span>
                <span className="min-w-0 break-words leading-tight">{title}</span>
              </p>
            </li>
          );
        })}
      </ol>
      {/* Mobile step indicator under the 4 progress bars */}
      <div className="flex items-center justify-between text-xs sm:hidden pt-0.5">
        <div className="flex items-center gap-1.5 font-semibold text-foreground min-w-0">
          <span className="grid size-4 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-contrast">
            {finished ? '✓' : current + 1}
          </span>
          <span className="truncate">{finished ? steps[steps.length - 1] : steps[current]}</span>
        </div>
        <span className="text-[11px] text-muted shrink-0 ml-2 tabular-nums">
          {finished ? `${steps.length}/${steps.length}` : `${current + 1}/${steps.length}`}
        </span>
      </div>
    </div>
  );
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
        <Button type="button" variant="secondary" size="lg" onClick={onNo}>
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
