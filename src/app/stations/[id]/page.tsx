import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';
import { AvailabilityStatus } from '@/components/stations/availability-dot';
import { ConnectorList } from '@/components/stations/connector-list';
import { StartCharging } from '@/components/stations/start-charging';
import { StationMapPanel } from '@/components/stations/station-finder';
import { Alert, Badge, ButtonLink, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { getStation } from '@/lib/csms/stations';
import { serverEnv } from '@/lib/env';
import type { Station } from '@/lib/types';
import { directionsUrl, formatDateTime, formatMoney } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface StationLoad {
  station: Station | null;
  demo: boolean;
  unreachable: boolean;
}

/** Deduplicates the CSMS call shared by generateMetadata() and the page itself. */
const loadStation = cache(async (id: string): Promise<StationLoad> => {
  try {
    const { station, demo } = await getStation(id);
    // A demo fallback with no match means the CSMS answered nothing, not a 404.
    return { station, demo, unreachable: station === null && demo };
  } catch (err) {
    console.error(`[station] failed to load ${id}`, err);
    return { station: null, demo: false, unreachable: true };
  }
});

export async function generateMetadata(props: PageProps<'/stations/[id]'>): Promise<Metadata> {
  const { id } = await props.params;
  const { station } = await loadStation(id);
  return { title: station?.name ?? 'Charging station' };
}

export default async function StationPage(props: PageProps<'/stations/[id]'>) {
  const { id } = await props.params;
  const { station, demo, unreachable } = await loadStation(id);

  if (!station) {
    if (!unreachable) notFound();
    return <StationUnavailable id={id} />;
  }

  const user = await getCurrentUser();
  const directions = directionsUrl(station);
  const hasCoordinates = station.latitude !== undefined && station.longitude !== undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <Link href="/stations" className="text-sm font-medium text-muted hover:text-foreground">
        ← All chargers
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {station.name}
          </h1>
          <p className="mt-1 text-sm text-muted sm:text-base">
            {station.address || 'Address not published'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <AvailabilityStatus availability={station.availability} />
            <span className="text-sm text-muted">
              {station.availableConnectors}/{station.totalConnectors} plugs free
            </span>
            {station.maxPowerKw && (
              <span className="text-sm text-muted">Up to {station.maxPowerKw} kW</span>
            )}
          </div>
        </div>

        {directions && (
          <ButtonLink
            href={directions}
            variant="secondary"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            Directions
          </ButtonLink>
        )}
      </header>

      {demo && (
        <Alert tone="warning" title="Sample data" className="mt-6">
          Live data is unavailable right now, so this page shows a sample charge point. Status and
          pricing may not match the real station.
        </Alert>
      )}

      {station.description && <p className="mt-6 text-sm text-muted">{station.description}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Connectors</CardTitle>
            </CardHeader>
            <CardBody>
              <ConnectorList connectors={station.connectors} />
            </CardBody>
          </Card>

          {hasCoordinates && (
            <div className="h-64 sm:h-80">
              <StationMapPanel
                stations={[station]}
                selectedId={station.id}
                fitToStations={false}
                zoom={15}
                scrollWheelZoom={false}
                ariaLabel={`Map showing ${station.name}`}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3 text-sm">
                <Detail label="Price">
                  {station.tariffPerKwh === undefined
                    ? 'Not published'
                    : `${formatMoney(station.tariffPerKwh)} per kWh`}
                </Detail>
                <Detail label="Hardware">
                  {[station.vendor, station.model].filter(Boolean).join(' ') || 'Not published'}
                </Detail>
                <Detail label="Charge point">
                  <span className="font-mono text-xs">{station.id}</span>
                </Detail>
                <Detail label="Last seen">
                  {station.isOnline ? 'Online now' : formatDateTime(station.lastSeenAt)}
                </Detail>
              </dl>

              {station.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
                  {station.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <StartCharging
            stationId={station.id}
            connectors={station.connectors}
            signedIn={Boolean(user)}
            remoteStartEnabled={serverEnv.enableRemoteStart()}
            hasIdTag={(user?.idTags?.length ?? 0) > 0}
          />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-foreground">{children}</dd>
    </div>
  );
}

function StationUnavailable({ id }: { id: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Alert tone="danger" title="This station cannot be reached">
        We could not load live details for <span className="font-mono text-xs">{id}</span> right
        now. The charging network may be temporarily unavailable.
      </Alert>
      <div className="mt-6 flex flex-wrap gap-2">
        <ButtonLink href="/stations">Back to all chargers</ButtonLink>
        <ButtonLink href="/help" variant="secondary">
          Get help
        </ButtonLink>
      </div>
    </div>
  );
}
