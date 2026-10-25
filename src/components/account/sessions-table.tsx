'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { format, useI18n } from '@/components/i18n-provider';
import type { ChargingSession } from '@/lib/types';
import {
  cn,
  connectorLetter,
  connectorStatusTone,
  formatDateTime,
  formatDuration,
  formatKwh,
  formatMoney,
  formatPower,
} from '@/lib/utils';
import { useToastMessage } from '@/lib/use-toast-message';
import { DatePicker } from '@/components/ui/date-picker';
import { StationReportModal } from './station-report-modal';

/** Tone per session state; the label is looked up in `d.account.sessions`. */
const STATUS_META: Record<
  ChargingSession['status'],
  { labelKey: 'inProgress' | 'completed' | 'rejected' | 'refunded'; tone: string }
> = {
  Active: { labelKey: 'inProgress', tone: connectorStatusTone('Charging') },
  Completed: { labelKey: 'completed', tone: connectorStatusTone('Available') },
  Rejected: { labelKey: 'rejected', tone: connectorStatusTone('Faulted') },
  Refunded: { labelKey: 'refunded', tone: connectorStatusTone('Reserved') },
};

interface StopResponse {
  status?: string;
  error?: string;
}

interface SessionsTableProps {
  sessions: ChargingSession[];
}

function TableTooltip({
  title,
  description,
  children,
  align = 'center',
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
}) {
  if (!description) {
    return <>{children}</>;
  }

  return (
    <div className="group/tip relative inline-flex items-center">
      {children}
      <div
        role="tooltip"
        className={cn(
          'pointer-events-none absolute bottom-full mb-2.5 z-50 hidden group-hover/tip:flex flex-col gap-0.5 rounded-xl border border-border/90 bg-surface px-3.5 py-2.5 text-left shadow-xl shadow-black/10 dark:shadow-black/60 whitespace-nowrap min-w-max transition-all duration-150 animate-in fade-in zoom-in-95',
          align === 'left' && 'left-0',
          align === 'center' && 'left-1/2 -translate-x-1/2',
          align === 'right' && 'right-0'
        )}
      >
        <span className="text-xs font-semibold text-foreground tracking-tight">{title}</span>
        <span className="text-[11px] text-muted leading-relaxed">{description}</span>
      </div>
    </div>
  );
}

export function SessionsTable({ sessions }: SessionsTableProps) {
  const { d } = useI18n();
  const router = useRouter();
  /** Ticks while a session is still running so its elapsed time stays honest. */
  const [clock, setClock] = useState(() => Date.now());
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useToastMessage(notice, 'success');
  useToastMessage(error, 'error');

  /** `YYYY-MM-DD` from the date inputs, in the driver's local time; '' = open-ended. */
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filtering = Boolean(from || to);
  const [openPicker, setOpenPicker] = useState<'from' | 'to' | null>(null);
  /** Station whose report is open, by charge point id. */
  const [reportFor, setReportFor] = useState<string | null>(null);

  const ordered = useMemo(() => {
    const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const toMs = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    return sessions
      .filter((s) => {
        const t = new Date(s.startTimestamp).getTime();
        return t >= fromMs && t <= toMs;
      })
      .sort((a, b) => {
        const activeFirst = Number(b.status === 'Active') - Number(a.status === 'Active');
        if (activeFirst !== 0) return activeFirst;
        return b.startTimestamp.localeCompare(a.startTimestamp);
      });
  }, [sessions, from, to]);

  const hasActive = useMemo(() => sessions.some((s) => s.status === 'Active'), [sessions]);

  useEffect(() => {
    if (!hasActive) return;
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [hasActive]);

  async function stop(transactionId: number) {
    setBusyId(transactionId);
    setNotice('');
    setError('');

    try {
      const res = await fetch(`/app-api/sessions/${transactionId}/stop`, { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as StopResponse;

      if (!res.ok) {
        setError(data.error ?? d.account.sessions.stopFailed);
        return;
      }

      setPendingId(null);
      setNotice(
        data.status === 'Accepted'
          ? d.account.sessions.stopAccepted
          : format(d.account.sessions.stopAnswered, { status: data.status ?? '—' }),
      );
      router.refresh();
    } catch {
      setError(d.account.profile.networkError);
    } finally {
      setBusyId(null);
    }
  }

  function duration(session: ChargingSession): string {
    return formatDuration(session.startTimestamp, session.stopTimestamp ?? new Date(clock));
  }


  function stopControls(session: ChargingSession): ReactNode {
    if (session.status !== 'Active') return null;

    if (pendingId === session.transactionId) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{d.account.sessions.stopConfirm}</span>
          <Button
            variant="danger"
            size="sm"
            loading={busyId === session.transactionId}
            onClick={() => stop(session.transactionId)}
          >
            {d.account.sessions.stopYes}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPendingId(null)}>
            {d.account.sessions.keepCharging}
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setNotice('');
          setError('');
          setPendingId(session.transactionId);
        }}
      >
        {d.account.sessions.stop}
        <span className="sr-only">
          {format(d.account.sessions.stopSrAt, {
            station: session.stationName ?? session.chargePointId,
          })}
        </span>
      </Button>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{d.account.sessions.title}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted">
            {d.account.sessions.empty}
          </p>
          <ButtonLink href="/stations" variant="secondary" size="sm">
            {d.nav.stations}
          </ButtonLink>
        </CardBody>
      </Card>
    );
  }

  return (
    // No overflow clipping here: the date picker's calendar hangs below the filter row.
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <CardTitle className="text-base font-semibold">{d.account.sessions.title}</CardTitle>
        <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted ring-1 ring-border/50">
          {format(d.account.sessions.count, { count: ordered.length })}
        </span>
      </CardHeader>

      <div className="flex flex-wrap items-end gap-2 border-b border-border/60 px-5 py-3">
        <DatePicker
          className="min-w-0 flex-1 sm:w-44 sm:flex-none"
          label={d.account.sessions.filterFrom}
          value={from}
          max={to || undefined}
          open={openPicker === 'from'}
          onOpenChange={(o) => setOpenPicker((p) => (o ? 'from' : p === 'from' ? null : p))}
          onChange={(v) => {
            setFrom(v);
            // Picking a start date leads straight on to the end date.
            if (v) setOpenPicker('to');
          }}
        />
        <DatePicker
          className="min-w-0 flex-1 sm:w-44 sm:flex-none"
          align="right"
          label={d.account.sessions.filterTo}
          value={to}
          min={from || undefined}
          open={openPicker === 'to'}
          onOpenChange={(o) => setOpenPicker((p) => (o ? 'to' : p === 'to' ? null : p))}
          onChange={setTo}
        />
        {filtering && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
          >
            {d.account.sessions.filterClear}
          </Button>
        )}
      </div>

      {ordered.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted">{d.account.sessions.filterEmpty}</p>
      )}

      {/* Mobile Card List (< md) */}
      <ul className="divide-y divide-border/60 md:hidden">
        {ordered.map((session) => {
          const meta = STATUS_META[session.status];
          const active = session.status === 'Active';

          return (
            <li key={session.transactionId} className="space-y-3 p-4 transition-colors hover:bg-surface-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setReportFor(session.chargePointId)}
                    className="block max-w-full truncate text-left font-semibold text-foreground underline-offset-4 hover:text-brand hover:underline"
                  >
                    {session.stationName ?? session.chargePointId}
                  </button>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <span className="size-1.5 rounded-full bg-brand/60" />
                    {format(d.account.sessions.connector, { id: connectorLetter(session.connectorId) })}
                  </p>
                </div>
                <Badge tone={meta.tone} className="shrink-0 text-xs font-medium">
                  {d.account.sessions[meta.labelKey]}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-muted/40 p-3 text-xs">
                <div>
                  <span className="block text-[11px] text-muted">{d.account.sessions.started}</span>
                  <span suppressHydrationWarning className="mt-0.5 block font-medium text-foreground">
                    {formatDateTime(session.startTimestamp)}
                  </span>
                  <span suppressHydrationWarning className="mt-0.5 block text-[11px] text-muted">
                    ⏱ {duration(session)}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-muted">{d.account.sessions.energy}</span>
                  <span className="mt-0.5 block font-semibold text-foreground text-sm">
                    {formatKwh(session.energyKwh)}
                  </span>
                  {active && (
                    <span className="mt-0.5 block text-[11px] font-medium text-brand animate-pulse">
                      ⚡ {formatPower(session.lastPowerW)} now
                    </span>
                  )}
                </div>
                <div className="col-span-2 flex items-center justify-between border-t border-border/40 pt-2">
                  <span className="text-[11px] text-muted">{d.account.sessions.cost}</span>
                  <div className="text-right">
                    <span className="block font-bold text-foreground text-sm">
                      {formatMoney(session.cost)}
                    </span>
                    {session.feeAmount && session.feeAmount > 0 ? (
                      <span className="block text-[11px] text-muted">
                        {d.account.sessions.energyCost} {formatMoney(session.energyCost)} · {format(d.account.sessions.feeShort, { percent: session.feePercent ?? '—' })} {formatMoney(session.feeAmount)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {stopControls(session)}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop & Tablet Table (md+) - No horizontal scroll, responsive layout */}
      <div className={cn('hidden', ordered.length > 0 && 'md:block')}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{d.account.sessions.caption}</caption>
          <thead className="border-b border-border/80 bg-surface-muted/50">
            <tr className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              <th scope="col" className="px-4 py-3 text-left align-middle">
                {d.account.sessions.station}
              </th>
              <th scope="col" className="px-3.5 py-3 text-left align-middle">
                {d.account.sessions.started}
              </th>
              <th scope="col" className="px-3.5 py-3 text-center align-middle">
                {d.account.sessions.energy}
              </th>
              <th scope="col" className="px-3.5 py-3 text-center align-middle">
                {d.account.sessions.cost}
              </th>
              <th scope="col" className="px-4 py-3 text-center align-middle">
                <span className="sr-only">{d.account.sessions.actions}</span>
              </th>
              <th scope="col" className="px-4 py-3 text-center align-middle">
                {d.account.sessions.status}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {ordered.map((session) => {
              const meta = STATUS_META[session.status];
              const active = session.status === 'Active';

              return (
                <tr
                  key={session.transactionId}
                  className="group transition-colors hover:bg-surface-muted/30 hover:relative hover:z-30"
                >
                  {/* Station & Connector */}
                  <td className="whitespace-nowrap px-4 py-3.5 align-middle">
                    <TableTooltip
                      align="left"
                      title={session.stationName ?? session.chargePointId}
                      description={format(d.account.sessions.connector, { id: connectorLetter(session.connectorId) })}
                    >
                      <button
                        type="button"
                        onClick={() => setReportFor(session.chargePointId)}
                        className="block max-w-[11rem] truncate text-left font-medium text-foreground underline-offset-4 hover:text-brand hover:underline lg:max-w-[14rem]"
                      >
                        {session.stationName ?? session.chargePointId}
                      </button>
                    </TableTooltip>
                  </td>

                  {/* Started Date & Duration */}
                  <td className="whitespace-nowrap px-3.5 py-3.5 align-middle">
                    <TableTooltip
                      align="left"
                      title={formatDateTime(session.startTimestamp)}
                      description={`${d.account.sessions.duration}: ${duration(session)}`}
                    >
                      <span suppressHydrationWarning className="block font-medium text-foreground text-xs sm:text-sm">
                        {formatDateTime(session.startTimestamp)}
                      </span>
                    </TableTooltip>
                  </td>

                  {/* Energy */}
                  <td className="whitespace-nowrap px-3.5 py-3.5 text-center align-middle">
                    <TableTooltip
                      align="center"
                      title={formatKwh(session.energyKwh)}
                      description={
                        active
                          ? `⚡ ${formatPower(session.lastPowerW)} (${d.account.sessions.rightNow})`
                          : d.account.sessions.energy
                      }
                    >
                      <span className="inline-flex items-center justify-center font-semibold text-foreground text-xs sm:text-sm">
                        {formatKwh(session.energyKwh)}
                        {active && <span className="ml-1 text-xs text-brand animate-pulse">⚡</span>}
                      </span>
                    </TableTooltip>
                  </td>

                  {/* Cost & Fee — centered */}
                  <td className="whitespace-nowrap px-3.5 py-3.5 text-center align-middle">
                    <TableTooltip
                      align="center"
                      title={formatMoney(session.cost)}
                      description={
                        session.feeAmount && session.feeAmount > 0
                          ? `${d.account.sessions.energyCost}: ${formatMoney(session.energyCost)} · ${format(d.account.sessions.feeShort, { percent: session.feePercent ?? '—' })}: ${formatMoney(session.feeAmount)}`
                          : undefined
                      }
                    >
                      <span className="block font-bold text-foreground text-xs sm:text-sm">
                        {formatMoney(session.cost)}
                      </span>
                    </TableTooltip>
                  </td>

                  {/* Actions — icon-only */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      {stopControls(session)}
                    </div>
                  </td>

                  {/* Status — last */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-center align-middle">
                    <TableTooltip
                      align="right"
                      title={d.account.sessions[meta.labelKey]}
                      description={
                        active
                          ? d.account.sessions.inProgress
                          : session.status === 'Completed'
                          ? 'Цэнэглэлт амжилттай дууссан'
                          : undefined
                      }
                    >
                      <Badge tone={meta.tone} className="px-2.5 py-0.5 text-xs font-medium">
                        {d.account.sessions[meta.labelKey]}
                      </Badge>
                    </TableTooltip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reportFor && (
        <StationReportModal
          sessions={ordered.filter((s) => s.chargePointId === reportFor)}
          stationName={
            sessions.find((s) => s.chargePointId === reportFor)?.stationName ?? reportFor
          }
          chargePointId={reportFor}
          rangeLabel={
            filtering
              ? `${from ? from.replaceAll('-', '.') : '…'} – ${to ? to.replaceAll('-', '.') : '…'}`
              : undefined
          }
          onClose={() => setReportFor(null)}
        />
      )}
    </Card>
  );
}
