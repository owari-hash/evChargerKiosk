'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import type { ChargingSession } from '@/lib/types';
import {
  connectorStatusTone,
  formatDateTime,
  formatDuration,
  formatKwh,
  formatMoney,
  formatPower,
} from '@/lib/utils';

const STATUS_META: Record<ChargingSession['status'], { label: string; tone: string }> = {
  Active: { label: 'In progress', tone: connectorStatusTone('Charging') },
  Completed: { label: 'Completed', tone: connectorStatusTone('Available') },
  Rejected: { label: 'Rejected', tone: connectorStatusTone('Faulted') },
};

interface StopResponse {
  status?: string;
  error?: string;
}

interface SessionsTableProps {
  sessions: ChargingSession[];
}

function stationHref(session: ChargingSession): string {
  return `/stations/${encodeURIComponent(session.chargePointId)}`;
}

export function SessionsTable({ sessions }: SessionsTableProps) {
  const router = useRouter();
  /** Ticks while a session is still running so its elapsed time stays honest. */
  const [clock, setClock] = useState(() => Date.now());
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const ordered = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        const activeFirst = Number(b.status === 'Active') - Number(a.status === 'Active');
        if (activeFirst !== 0) return activeFirst;
        return b.startTimestamp.localeCompare(a.startTimestamp);
      }),
    [sessions],
  );

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
        setError(data.error ?? 'Could not stop the session. Please try again.');
        return;
      }

      setPendingId(null);
      setNotice(
        data.status === 'Accepted'
          ? 'Stop request accepted. The charger is ending the session now.'
          : `The charger answered "${data.status ?? 'unknown'}". If the session keeps running, stop it at the station.`,
      );
      router.refresh();
    } catch {
      setError('Could not reach the server. Please check your connection and try again.');
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
          <span className="text-sm text-muted">Stop this charge?</span>
          <Button
            variant="danger"
            size="sm"
            loading={busyId === session.transactionId}
            onClick={() => stop(session.transactionId)}
          >
            Yes, stop
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPendingId(null)}>
            Keep charging
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
        Stop
        <span className="sr-only">
          {' '}
          charging at {session.stationName ?? session.chargePointId}
        </span>
      </Button>
    );
  }

  if (ordered.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Charging history</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-muted">
            Your charging history appears here once a charge tag is linked to your account and used
            at a charger.
          </p>
          <ButtonLink href="/account" variant="secondary" size="sm">
            Manage charge tags
          </ButtonLink>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Charging history</CardTitle>
        <p className="text-sm text-muted">
          {ordered.length} {ordered.length === 1 ? 'session' : 'sessions'}
        </p>
      </CardHeader>

      {(notice || error) && (
        <div className="space-y-3 border-b border-border px-5 py-4">
          {notice && <Alert tone="success">{notice}</Alert>}
          {error && <Alert tone="danger">{error}</Alert>}
        </div>
      )}

      <ul className="divide-y divide-border md:hidden">
        {ordered.map((session) => {
          const meta = STATUS_META[session.status];
          const active = session.status === 'Active';

          return (
            <li key={session.transactionId} className="space-y-3 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={stationHref(session)}
                    className="font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {session.stationName ?? session.chargePointId}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted">Connector {session.connectorId}</p>
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-muted">Started</dt>
                  <dd suppressHydrationWarning className="text-foreground">
                    {formatDateTime(session.startTimestamp)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Duration</dt>
                  <dd suppressHydrationWarning className="text-foreground">
                    {duration(session)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Energy</dt>
                  <dd className="text-foreground">{formatKwh(session.energyKwh)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Cost</dt>
                  <dd className="text-foreground">{formatMoney(session.cost)}</dd>
                </div>
                {active && (
                  <div>
                    <dt className="text-muted">Right now</dt>
                    <dd className="text-foreground">{formatPower(session.lastPowerW)}</dd>
                  </div>
                )}
              </dl>

              {stopControls(session)}
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <caption className="sr-only">Your charging sessions, most recent first</caption>
          <thead>
            <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
              <th scope="col" className="px-5 py-3">
                Station
              </th>
              <th scope="col" className="px-5 py-3">
                Connector
              </th>
              <th scope="col" className="px-5 py-3">
                Started
              </th>
              <th scope="col" className="px-5 py-3">
                Duration
              </th>
              <th scope="col" className="px-5 py-3">
                Energy
              </th>
              <th scope="col" className="px-5 py-3">
                Cost
              </th>
              <th scope="col" className="px-5 py-3">
                Status
              </th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((session) => {
              const meta = STATUS_META[session.status];
              const active = session.status === 'Active';

              return (
                <tr key={session.transactionId} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <Link
                      href={stationHref(session)}
                      className="font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {session.stationName ?? session.chargePointId}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-muted">{session.connectorId}</td>
                  <td suppressHydrationWarning className="px-5 py-3 whitespace-nowrap text-muted">
                    {formatDateTime(session.startTimestamp)}
                  </td>
                  <td suppressHydrationWarning className="px-5 py-3 whitespace-nowrap text-muted">
                    {duration(session)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-foreground">
                    {formatKwh(session.energyKwh)}
                    {active && (
                      <span className="block text-xs text-muted">
                        {formatPower(session.lastPowerW)} now
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-foreground">
                    {formatMoney(session.cost)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </td>
                  <td className="px-5 py-3">{stopControls(session)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
