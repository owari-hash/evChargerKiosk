'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, ButtonLink, Card, CardBody, CardHeader, CardTitle, Field, Select } from '@/components/ui';
import type { StationConnector } from '@/lib/types';

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
      const res = await fetch(`/api/stations/${encodeURIComponent(stationId)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectorId ? { connectorId: Number(connectorId) } : {}),
      });
      const payload = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
      if (!res.ok) throw new Error(payload.error ?? 'The charge point did not accept the request');
      setStatus(payload.status ?? 'Accepted');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The request could not be sent');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start charging</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {!remoteStartEnabled ? (
          <p className="text-sm text-muted">
            Sessions at this charge point are started on the unit itself — hold your charge tag
            against the reader and plug in.
          </p>
        ) : !signedIn ? (
          <>
            <p className="text-sm text-muted">
              Sign in to start a session from your phone. You can always start one at the charge
              point instead.
            </p>
            <ButtonLink href={`/login?next=/stations/${encodeURIComponent(stationId)}`}>
              Sign in to start
            </ButtonLink>
          </>
        ) : !hasIdTag ? (
          <>
            <p className="text-sm text-muted">
              Link the charge tag printed on your RFID card to your account, and you can start a
              session from here.
            </p>
            <ButtonLink href="/account" variant="secondary">
              Link a charge tag
            </ButtonLink>
          </>
        ) : free.length === 0 ? (
          <p className="text-sm text-muted">
            Every plug here is busy or out of service right now. Availability updates on this page
            as the station reports in.
          </p>
        ) : (
          <>
            <Field label="Connector" htmlFor="start-connector">
              <Select
                id="start-connector"
                value={connectorId}
                onChange={(event) => setConnectorId(event.target.value)}
              >
                {free.map((connector) => (
                  <option key={connector.connectorId} value={connector.connectorId}>
                    Connector {connector.connectorId}
                    {connector.type ? ` · ${connector.type}` : ''}
                    {connector.powerKw ? ` · ${connector.powerKw} kW` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Button type="button" onClick={start} loading={busy} className="w-full">
              Start charging
            </Button>

            <p className="text-sm text-muted">
              Plug the cable in first. The station has the final say and may still decline.
            </p>
          </>
        )}

        {status &&
          (status === 'Accepted' ? (
            <Alert tone="success" title="Request accepted">
              The charge point accepted the request. Charging starts once the cable is locked in.
            </Alert>
          ) : (
            <Alert tone="warning" title="Not started">
              The charge point replied “{status}”. Try another connector, or start the session at
              the unit.
            </Alert>
          ))}

        {error && (
          <Alert tone="danger" title="Could not start">
            {error}
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}
