'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { format, useI18n } from '@/components/i18n-provider';
import { Alert, Button, ButtonLink, Card, CardBody, CardHeader, CardTitle, Field, Select } from '@/components/ui';
import { EbarimtModal } from '@/components/account/ebarimt-modal';
import type { ChargingSession, StationAvailability, StationConnector } from '@/lib/types';
import {
  cn,
  formatDuration,
  formatKwh,
  formatMoney,
  formatPower,
  formatPowerKw,
  formatTariff,
  intlLocale,
} from '@/lib/utils';

/** Poll interval while a session is running, in milliseconds. */
const LIVE_MS = 2_000;
/** Fast poll while waiting for station start handshake. */
const STARTING_MS = 1_000;
/** Regular station status poll interval. */
const IDLE_MS = 3_000;

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

const STEPS: FlowStep[] = [
  'signin',
  'tag',
  'connector',
  'plug',
  'start',
  'preparing',
  'charging',
  'stopping',
  'done',
];

const AUTOMATIC: ReadonlySet<FlowStep> = new Set(['preparing', 'charging', 'stopping', 'done']);

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
  onLiveUpdate?: (live: LiveState) => void;
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
  onLiveUpdate,
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleFeed, setStaleFeed] = useState(false);
  const [showEbarimtModal, setShowEbarimtModal] = useState(false);

  /**
   * Guns a driver may start right now.
   *
   * `Preparing` is included deliberately: on DC hardware the gun enters that
   * state the moment a cable is plugged into the car, which is precisely when
   * the driver wants to start. Filtering to `Available` alone made the one gun
   * they were standing at disappear from the picker, leaving only the empty one.
   * A gun already running a session is excluded.
   */
  const free = live.connectors.filter(
    (c) =>
      c.availability === 'Operative' &&
      !c.currentTransactionId &&
      (c.status === 'Available' || c.status === 'Preparing'),
  );
  // Seeded from the sticker when the driver arrived by QR, so the gun they
  // are standing at is already chosen.
  const [connectorId, setConnectorId] = useState(
    initialConnectorId ? String(initialConnectorId) : '',
  );

  /**
   * The gun the start request will name. Empty until the driver chooses, or
   * until a QR sticker chose for them.
   *
   * It is never guessed. The station rejects a RemoteStartTransaction that does
   * not name a connector, but guessing one is worse than refusing to start:
   * picking "the only free gun" silently targeted the gun the driver was NOT
   * standing at, and started it with no car attached.
   */
  const targetConnectorId = connectorId;

  const session = live.session;
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
    hasFreeConnector: free.length > 0,
    hasConnector: Boolean(targetConnectorId),
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/app-api/stations/${encodeURIComponent(stationId)}/live`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('live feed unavailable');
      const data = (await res.json()) as LiveState;
      setLive(data);
      onLiveUpdate?.(data);
      setStaleFeed(false);
    } catch {
      setStaleFeed(true);
    }
  }, [stationId, onLiveUpdate]);

  useEffect(() => {
    const interval = awaitingStation ? STARTING_MS : AUTOMATIC.has(step) ? LIVE_MS : IDLE_MS;
    const timer = setInterval(() => void refresh(), interval);
    return () => clearInterval(timer);
  }, [refresh, step, awaitingStation]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/app-api/stations/${encodeURIComponent(stationId)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          targetConnectorId ? { connectorId: Number(targetConnectorId) } : {},
        ),
      });
      const payload = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!res.ok) throw new Error(payload.error ?? d.start.requestFailed);
      if (payload.status && payload.status !== 'Accepted') {
        throw new Error(format(d.start.rejectedBody, { status: payload.status }));
      }
      setRequested(true);
      await refresh();
      [500, 1200, 2200, 3500].forEach((delay) => setTimeout(() => void refresh(), delay));
    } catch (err) {
      setError(err instanceof Error ? err.message : d.start.requestFailed);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Releases the cable after the session has ended.
   *
   * The gun stays latched in `Finishing` until the station is told to let go,
   * and this hardware offers the driver no way to do that at the unit — so
   * without this button they are physically attached to the charger.
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
      if (!res.ok) throw new Error(payload.error ?? d.flow.unlockFailed);
      if (payload.status && payload.status !== 'Unlocked') {
        throw new Error(format(d.flow.unlockRejected, { status: payload.status }));
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : d.flow.unlockFailed);
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
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : d.start.requestFailed);
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <p className="mt-1 text-xs text-muted">
            {format(t.stepOf, { n: stepIndex + 1, total: STEPS.length })}
          </p>
        </CardHeader>

        <CardBody className="space-y-4">
          {!remoteStartEnabled && !active && (
            <Alert tone="info" title={t.localOnlyTitle}>
              {t.localOnlyBody}
            </Alert>
          )}

          {live.availability === 'offline' && !active && (
            <Alert tone="warning" title={d.status.availability.offline}>
              {t.stationOffline}
            </Alert>
          )}

          {session && (
            <div className="space-y-3">
              {active && <LiveReadout session={active} intl={intl} tariffPerKwh={live.tariffPerKwh} />}
              {session.ebarimt && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-foreground flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ И-Баримт үүссэн
                      </span>
                      {session.ebarimt.lottery && (
                        <span className="font-mono font-bold">
                          Сугалаа №: {session.ebarimt.lottery}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      {session.ebarimt.type === 'B2B_RECEIPT' ? 'Байгууллагын баримт' : 'Хувь хүний баримт'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                    onClick={() => setShowEbarimtModal(true)}
                  >
                    И-Баримт харах
                  </Button>
                </div>
              )}
            </div>
          )}

          <ol className="space-y-1">
            {STEPS.map((key, index) => (
              <StepRow
                key={key}
                step={key}
                index={index}
                currentIndex={stepIndex}
                title={t[`s${index + 1}Title` as keyof typeof t] as string}
                body={t[`s${index + 1}Body` as keyof typeof t] as string}
              >
                {key === step && (
                  <StepAction
                    step={key}
                    stationId={stationId}
                    free={free}
                    connectorId={connectorId}
                    canStart={Boolean(targetConnectorId)}
                    onUnlock={() => void unlock()}
                    onConnector={setConnectorId}
                    onPlugged={() => setPlugged(true)}
                    onStart={() => void start()}
                    onStop={() => void stop()}
                    onOpenEbarimt={() => setShowEbarimtModal(true)}
                    busy={busy}
                    session={session}
                    intl={intl}
                  />
                )}
              </StepRow>
            ))}
          </ol>

          <p className="text-xs text-muted">{t.autoNote}</p>

          {free.length === 0 && !active && live.availability !== 'offline' && (
            <p className="text-sm text-muted">{t.connectorBusy}</p>
          )}

          {staleFeed && <p className="text-xs text-warning">{t.refreshFailed}</p>}

          {error && (
            <Alert tone="danger" title={d.start.couldNotStartTitle}>
              {error}
            </Alert>
          )}
        </CardBody>
      </Card>

      {showEbarimtModal && session && (
        <EbarimtModal
          session={session}
          onClose={() => setShowEbarimtModal(false)}
          onSuccess={(updatedSession) => {
            setLive((prev) => ({ ...prev, session: updatedSession }));
          }}
        />
      )}
    </>
  );
}

function resolveStep(input: {
  signedIn: boolean;
  hasIdTag: boolean;
  plugged: boolean;
  requested: boolean;
  session: ChargingSession | null;
  sessionConnector: StationConnector | undefined;
  hasFreeConnector: boolean;
  /** A specific gun has been chosen, by the driver or by a scanned sticker. */
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
  // No gun free: the connector step shows why. No gun chosen: it shows the
  // picker. The station refuses a start that does not name one, so the driver
  // must get past this step before the start button is offered at all.
  if (!input.hasFreeConnector) return 'connector';
  if (!input.hasConnector) return 'connector';
  if (!input.plugged) return 'plug';
  return 'start';
}

function StepRow({
  step,
  index,
  currentIndex,
  title,
  body,
  children,
}: {
  step: FlowStep;
  index: number;
  currentIndex: number;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  const { d } = useI18n();
  const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo';

  return (
    <li
      className={cn(
        'rounded-xl px-3 py-2.5 transition',
        state === 'current' && 'bg-brand-soft ring-1 ring-brand/30',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold',
            state === 'done' && 'bg-brand text-brand-contrast',
            state === 'current' && 'bg-brand text-brand-contrast',
            state === 'todo' && 'bg-surface-muted text-muted',
          )}
        >
          {state === 'done' ? '✓' : index + 1}
        </span>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-sm font-semibold',
              state === 'todo' ? 'text-muted' : 'text-foreground',
            )}
          >
            {title}
            {state === 'current' && (
              <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-contrast">
                {d.flow.current}
              </span>
            )}
            {state === 'todo' && AUTOMATIC.has(step) && (
              <span className="ml-2 text-[11px] font-medium text-muted">({d.flow.waiting})</span>
            )}
          </p>

          {state !== 'todo' && <p className="mt-0.5 text-xs text-muted">{body}</p>}
          {children ? <div className="mt-3">{children}</div> : null}
        </div>
      </div>
    </li>
  );
}

function StepAction({
  step,
  stationId,
  free,
  connectorId,
  onConnector,
  onPlugged,
  onStart,
  onStop,
  onUnlock,
  onOpenEbarimt,
  busy,
  canStart,
  session,
  intl,
}: {
  step: FlowStep;
  stationId: string;
  free: StationConnector[];
  connectorId: string;
  onConnector: (value: string) => void;
  onPlugged: () => void;
  onStart: () => void;
  onStop: () => void;
  onUnlock: () => void;
  onOpenEbarimt?: () => void;
  busy: boolean;
  /** False until a specific gun is identified; the station refuses otherwise. */
  canStart: boolean;
  session: ChargingSession | null;
  intl: string;
}) {
  const { d } = useI18n();
  const t = d.flow;

  switch (step) {
    case 'signin':
      return (
        <ButtonLink href={`/login?next=/stations/${encodeURIComponent(stationId)}`} size="sm">
          {d.start.signInCta}
        </ButtonLink>
      );

    case 'tag':
      return (
        <ButtonLink href="/account" variant="secondary" size="sm">
          {d.start.linkTagCta}
        </ButtonLink>
      );

    case 'connector':
      if (free.length === 0) return <p className="text-xs text-muted">{t.connectorBusy}</p>;
      return (
        <Field label={d.start.connectorLabel} htmlFor="flow-connector">
          <Select
            id="flow-connector"
            value={connectorId}
            onChange={(event) => onConnector(event.target.value)}
          >
            <option value="">{d.start.anyConnector}</option>
            {free.map((c) => (
              <option key={c.connectorId} value={c.connectorId}>
                {format(d.start.connectorOption, { id: c.connectorId })}
                {c.type ? ` · ${c.type}` : ''}
                {c.powerKw ? ` · ${formatPowerKw(c.powerKw, intl)}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      );

    case 'plug':
      return (
        <Button type="button" variant="secondary" size="sm" onClick={onPlugged}>
          {t.plugConfirm}
        </Button>
      );

    case 'start':
      return (
        <Button
          type="button"
          onClick={onStart}
          loading={busy}
          size="sm"
          disabled={!canStart}
        >
          {busy ? t.starting : t.startNow}
        </Button>
      );

    case 'preparing':
      return null;

    case 'charging':
      return (
        <Button type="button" variant="danger" size="sm" onClick={onStop} loading={busy}>
          {busy ? t.stopping : t.stopNow}
        </Button>
      );

    case 'stopping':
      return null;

    case 'done':
      return (
        <div className="space-y-3">
          {session && session.feeAmount != null && session.feeAmount > 0 && (
            <FeeBreakdown session={session} intl={intl} />
          )}
          <div className="flex flex-wrap gap-2 items-center">
            {session && (
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
                onClick={onOpenEbarimt}
              >
                И-Баримт харах / авах
              </Button>
            )}
            {session && (
              <Button type="button" size="sm" variant="secondary" onClick={onUnlock}>
                {t.unlockNow}
              </Button>
            )}
            {session && (
              <Link
                href="/account/sessions"
                className="inline-flex h-9 items-center rounded-xl bg-surface-muted px-3 text-xs font-semibold text-foreground ring-1 ring-border transition hover:bg-surface"
              >
                {t.viewReceipt}
              </Link>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={() => location.reload()}>
              {t.startAnother}
            </Button>
          </div>
        </div>
      );

    default:
      return null;
  }
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
    <div className="rounded-2xl bg-surface-muted/60 p-4 ring-1 ring-border">
      <p className="text-xs font-medium text-muted">
        {format(t.sessionId, { id: session.transactionId })}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
        <Metric label={d.stations.price} value={formatTariff(tariffPerKwh, intl)} />
      </dl>
    </div>
  );
}

/** Energy cost, service fee and total of a finished session billed with a fee. */
function FeeBreakdown({ session, intl }: { session: ChargingSession; intl: string }) {
  const { d } = useI18n();
  const t = d.account.sessions;

  return (
    <dl className="max-w-xs space-y-1 rounded-xl bg-surface-muted/60 p-3 text-xs ring-1 ring-border">
      <div className="flex justify-between gap-4">
        <dt className="text-muted">{t.energyCost}</dt>
        <dd className="font-semibold text-foreground">{formatMoney(session.energyCost, intl)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">{format(t.serviceFee, { percent: session.feePercent ?? '—' })}</dt>
        <dd className="font-semibold text-foreground">{formatMoney(session.feeAmount, intl)}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-border/50 pt-1">
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
