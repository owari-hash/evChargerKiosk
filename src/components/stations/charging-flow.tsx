'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { format, useI18n } from '@/components/i18n-provider';
import { Alert, Badge, Button, ButtonLink, Card } from '@/components/ui';
import { EbarimtModal } from '@/components/account/ebarimt-modal';
import {
  noteStartRequested,
  registerChargingFlow,
  requestSessionCheck,
  showSessionOnScreen,
} from '@/lib/session-events';
import type { ChargingSession, StationAvailability, StationConnector } from '@/lib/types';
import {
  cn,
  connectorStatusLabel,
  connectorStatusTone,
  formatDuration,
  formatKwh,
  formatMoney,
  formatPower,
  formatPowerKw,
  intlLocale,
} from '@/lib/utils';

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
  /**
   * When the station last talked to the network, already formatted on the
   * server (browsers without Mongolian locale data format dates differently,
   * which broke hydration). Shown only while offline.
   */
  lastSeenLabel?: string;
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
      (c.status === 'Available' || c.status === 'Preparing'),
  );
}

export function ChargingFlow({
  stationId,
  connectors,
  availability,
  tariffPerKwh,
  lastSeenLabel,
  signedIn,
  hasIdTag,
  remoteStartEnabled,
  initialConnectorId,
  returnTo,
}: ChargingFlowProps) {
  const { d, locale } = useI18n();
  const intl = intlLocale(locale);
  const t = d.flow;

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
   * The API keeps returning their most recent session forever, and the step
   * machine treats any session as "done". Dismissing it locally is what lets
   * them start another charge.
   */
  const [dismissedSessionId, setDismissedSessionId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleFeed, setStaleFeed] = useState(false);
  const [showEbarimtModal, setShowEbarimtModal] = useState(false);

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
  // A chosen gun that someone else has since taken no longer counts.
  const chosen = free.find((c) => String(c.connectorId) === connectorId);

  const session =
    live.session && live.session.transactionId === dismissedSessionId ? null : live.session;
  const active = session?.status === 'Active' ? session : null;

  const sessionConnector = active
    ? live.connectors.find((c) => c.connectorId === active.connectorId)
    : undefined;

  const awaitingStation = requested && !active;

  const step = resolveStep({
    signedIn,
    hasIdTag,
    plugged,
    requested: awaitingStation,
    session,
    sessionConnector,
    hasConnector: Boolean(chosen),
  });

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

  const refresh = useCallback(async () => {
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
  }, [stationId, setLive]);

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
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/app-api/stations/${encodeURIComponent(stationId)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectorId: chosen.connectorId }),
      });
      const payload = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!res.ok) throw new Error(payload.error ?? d.start.requestFailed);
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
   */
  function confirmPlugged() {
    const looksPlugged =
      chosen != null && chosen.status !== 'Available';
    if (!looksPlugged) {
      setError(t.plugNotDetected);
      return;
    }
    setError(null);
    setPlugged(true);
  }

  /** Clears the finished session so the driver can charge again. */
  function startAnother() {
    if (live.session) setDismissedSessionId(live.session.transactionId);
    setPlugged(false);
    setRequested(false);
    setConnectorId('');
    setError(null);
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
  // Scanned gun first, so a driver standing at it finds it without comparing.
  const ordered =
    initialConnectorId === undefined
      ? live.connectors
      : [...live.connectors].sort(
          (a, b) =>
            Number(b.connectorId === initialConnectorId) -
            Number(a.connectorId === initialConnectorId),
        );

  return (
    <div className="space-y-4">
      <Stepper steps={steps} current={visibleStep} finished={step === 'done'} label={t.title} />

      <Card className="p-4 sm:p-5">
        <div className="space-y-4">
          {offline && (
            <Alert tone="warning" title={d.status.availability.offline}>
              {t.stationOffline}
              {lastSeenLabel && (
                <span className="mt-1 block text-xs opacity-80">
                  {format(t.lastSeenHint, { time: lastSeenLabel })}
                </span>
              )}
            </Alert>
          )}

          {!remoteStartEnabled && !active && !offline && (
            <Alert tone="info" title={t.localOnlyTitle}>
              {t.localOnlyBody}
            </Alert>
          )}

          {step === 'signin' && (
            <ActionBlock title={t.stepSignIn} body={t.signInBody}>
              <ButtonLink href={`/login?next=${encodeURIComponent(returnTo)}`}>
                {d.start.signInCta}
              </ButtonLink>
            </ActionBlock>
          )}

          {step === 'tag' && (
            <ActionBlock title={t.stepSignIn} body={t.tagPendingBody}>
              <ButtonLink href="/account" variant="secondary">
                {t.tagPendingCta}
              </ButtonLink>
            </ActionBlock>
          )}

          {step === 'connector' && (
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
                disabled={offline}
              />
            </div>
          )}

          {step === 'plug' && (
            <ActionBlock
              title={t.stepPlug}
              body={format(t.plugBody, { connector: chosenLabel })}
            >
              <Button type="button" onClick={confirmPlugged}>
                {t.plugConfirm}
              </Button>
              <Button type="button" variant="ghost" onClick={chooseAnother}>
                {t.changeConnector}
              </Button>
            </ActionBlock>
          )}

          {step === 'start' && (
            <ActionBlock
              title={t.stepCharge}
              body={format(t.startBody, { connector: chosenLabel })}
            >
              <Button type="button" onClick={() => void start()} loading={busy} disabled={offline}>
                {busy ? t.starting : t.startNow}
              </Button>
              <Button type="button" variant="ghost" onClick={chooseAnother} disabled={busy}>
                {t.changeConnector}
              </Button>
            </ActionBlock>
          )}

          {step === 'preparing' && <StatusLine title={t.waitingTitle} body={t.waitingBody} pending />}

          {step === 'charging' && active && (
            <div className="space-y-4">
              <StatusLine title={t.chargingTitle} body={t.chargingBody} />
              <LiveReadout session={active} intl={intl} tariffPerKwh={live.tariffPerKwh} />
              <Button type="button" variant="danger" onClick={() => void stop()} loading={busy}>
                {busy ? t.stopping : t.stopNow}
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

          {error && (
            <Alert tone="danger" title={d.start.couldNotStartTitle}>
              {error}
            </Alert>
          )}
        </div>
      </Card>

      {step !== 'connector' && (
        <Card className="p-4 sm:p-5">
          <h2 className="text-base font-semibold text-foreground">{d.stations.connectorsTitle}</h2>
          <ConnectorPicker
            className="mt-4"
            connectors={ordered}
            free={free}
            selectedId={chosen?.connectorId ?? active?.connectorId}
            scannedId={initialConnectorId}
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
    format(d.start.connectorOption, { id: c.connectorId }),
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
    <ol aria-label={label} className="grid grid-cols-4 gap-1.5">
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
                state === 'todo' ? 'bg-surface-muted ring-1 ring-border' : 'bg-brand',
              )}
            />
            <p
              className={cn(
                'mt-2 flex items-start gap-1.5 text-xs leading-4 sm:text-sm',
                state === 'todo' ? 'text-muted' : 'font-semibold text-foreground',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold sm:size-5 sm:text-[11px]',
                  state === 'todo'
                    ? 'bg-surface-muted text-muted ring-1 ring-border'
                    : 'bg-brand text-brand-contrast',
                )}
              >
                {state === 'done' ? '✓' : index + 1}
              </span>
              <span className="min-w-0 break-words">{title}</span>
            </p>
          </li>
        );
      })}
    </ol>
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

function StatusLine({ title, body, pending = false }: { title: string; body: string; pending?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className={cn(
          'mt-1 size-3 shrink-0 rounded-full bg-brand',
          pending && 'animate-pulse',
        )}
      />
      <div className="min-w-0" role="status">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
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
  disabled = false,
  className,
}: {
  connectors: StationConnector[];
  free: StationConnector[];
  selectedId?: number;
  scannedId?: number;
  onChoose?: (id: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const { d, locale } = useI18n();
  const intl = intlLocale(locale);

  if (connectors.length === 0) {
    return <p className={cn('text-sm text-muted', className)}>{d.stations.noConnectors}</p>;
  }

  return (
    <ul className={cn('space-y-2', className)} role={onChoose ? 'radiogroup' : undefined} aria-label={d.stations.connectorsTitle}>
      {connectors.map((c) => {
        const isFree = free.some((f) => f.connectorId === c.connectorId);
        const selectable = Boolean(onChoose) && isFree && !disabled;
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
                'grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold',
                selected ? 'bg-brand text-brand-contrast' : 'bg-surface-muted text-foreground',
              )}
            >
              {c.connectorId}
            </span>
            <span className="min-w-0 flex-1">
              {c.connectorId === scannedId && (
                <span className="block text-xs font-semibold text-brand-strong">
                  {d.stations.scannedConnector}
                </span>
              )}
              <span className="block text-sm font-semibold text-foreground">
                <span className="sr-only">{format(d.stations.connectorN, { id: c.connectorId })}</span>
                {c.type ?? d.stations.plugTypeMissing}
                {c.powerKw ? ` · ${formatPowerKw(c.powerKw, intl)}` : ''}
              </span>
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
            <Badge tone={connectorStatusTone(c.status)} className="shrink-0">
              {connectorStatusLabel(c.status, locale)}
            </Badge>
            {selectable && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4 shrink-0 text-muted" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
              </svg>
            )}
          </>
        );

        const rowClass = cn(
          'flex w-full items-center gap-3 rounded-xl p-3 text-left ring-1 transition',
          selected ? 'bg-brand-soft ring-brand/40' : 'bg-surface-muted/40 ring-border',
        );

        return (
          <li key={c.connectorId}>
            {onChoose ? (
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!selectable}
                onClick={() => onChoose(c.connectorId)}
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

  return (
    <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-muted/60 p-4 ring-1 ring-border sm:grid-cols-3">
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
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className={cn('mt-0.5 text-foreground', strong ? 'text-lg font-bold' : 'text-sm font-semibold')}>
        {value}
      </dd>
    </div>
  );
}
