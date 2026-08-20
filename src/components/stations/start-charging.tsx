'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, ButtonLink, Card, CardBody, CardHeader, CardTitle, Field, Select } from '@/components/ui';
import { format, useI18n } from '@/components/i18n-provider';
import type { StationConnector } from '@/lib/types';
import { formatPowerKw, intlLocale } from '@/lib/utils';

interface StartChargingProps {
  stationId: string;
  connectors: StationConnector[];
  signedIn: boolean;
  /** ENABLE_REMOTE_START on the server; when off, sessions begin at the kiosk. */
  remoteStartEnabled: boolean;
  hasIdTag: boolean;
}

export function StartCharging({
  stationId,
  connectors,
  signedIn,
  remoteStartEnabled,
  hasIdTag,
}: StartChargingProps) {
  const router = useRouter();
  const { d, locale } = useI18n();
  const intl = intlLocale(locale);
  const free = connectors.filter(
    (c) => c.status === 'Available' && c.availability === 'Operative',
  );
  const [connectorId, setConnectorId] = useState(() => String(free[0]?.connectorId ?? ''));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(`/app-api/stations/${encodeURIComponent(stationId)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectorId ? { connectorId: Number(connectorId) } : {}),
      });
      const payload = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!res.ok) throw new Error(payload.error ?? d.start.rejected);
      setStatus(payload.status ?? 'Accepted');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : d.start.requestFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{d.start.title}</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {!remoteStartEnabled ? (
          <p className="text-sm text-muted">{d.start.localOnly}</p>
        ) : !signedIn ? (
          <>
            <p className="text-sm text-muted">{d.start.signInBody}</p>
            <ButtonLink href={`/login?next=/stations/${encodeURIComponent(stationId)}`}>
              {d.start.signInCta}
            </ButtonLink>
          </>
        ) : !hasIdTag ? (
          <>
            <p className="text-sm text-muted">{d.start.linkTagBody}</p>
            <ButtonLink href="/account" variant="secondary">
              {d.start.linkTagCta}
            </ButtonLink>
          </>
        ) : free.length === 0 ? (
          <p className="text-sm text-muted">{d.start.allBusy}</p>
        ) : (
          <>
            <Field label={d.start.connectorLabel} htmlFor="start-connector">
              <Select
                id="start-connector"
                value={connectorId}
                onChange={(event) => setConnectorId(event.target.value)}
              >
                {free.map((connector) => (
                  <option key={connector.connectorId} value={connector.connectorId}>
                    {format(d.start.connectorOption, { id: connector.connectorId })}
                    {connector.type ? ` · ${connector.type}` : ''}
                    {connector.powerKw ? ` · ${formatPowerKw(connector.powerKw, intl)}` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Button type="button" onClick={start} loading={busy} className="w-full">
              {busy ? d.start.submitting : d.start.submit}
            </Button>

            <p className="text-sm text-muted">
              {d.start.plugFirst}
            </p>
          </>
        )}

        {status &&
          (status === 'Accepted' ? (
            <Alert tone="success" title={d.start.acceptedTitle}>
              {d.start.acceptedBody2}
            </Alert>
          ) : (
            <Alert tone="warning" title={d.start.notStartedTitle}>
              {format(d.start.rejectedBody, { status })}
            </Alert>
          ))}

        {error && (
          <Alert tone="danger" title={d.start.couldNotStartTitle}>
            {error}
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}
