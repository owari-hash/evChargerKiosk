import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';
import { AvailabilityStatus } from '@/components/stations/availability-dot';
import { ConnectorList } from '@/components/stations/connector-list';
import { ChargingFlow } from '@/components/stations/charging-flow';
import { StationMapPanel } from '@/components/stations/station-finder';
import { Alert, Badge, ButtonLink, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { getStation } from '@/lib/csms/stations';
import { serverEnv } from '@/lib/env';
import { format, getTranslations } from '@/lib/i18n';
import type { Station } from '@/lib/types';
import { directionsUrl, formatDateTime, formatMoney, formatPowerKw, intlLocale } from '@/lib/utils';

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
  const [{ station }, { d }] = await Promise.all([loadStation(id), getTranslations()]);
  return { title: station?.name ?? d.stations.chargePoint };
}

export default async function StationPage(props: PageProps<'/stations/[id]'>) {
  const { id } = await props.params;
  const [{ station, demo, unreachable }, { locale, d }] = await Promise.all([
    loadStation(id),
    getTranslations(),
  ]);
  const intl = intlLocale(locale);

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
        {d.stations.allChargers}
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {station.name}
          </h1>
          <p className="mt-1 text-sm text-muted sm:text-base">
            {station.address || d.stations.addressMissing}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <AvailabilityStatus availability={station.availability} locale={locale} />
            <span className="text-sm text-muted">
              {format(d.stations.plugsFree, {
                available: station.availableConnectors,
                total: station.totalConnectors,
              })}
            </span>
            {station.maxPowerKw && (
              <span className="text-sm text-muted">
                {format(d.stations.upToPower, { power: formatPowerKw(station.maxPowerKw, intl) })}
              </span>
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
            {d.stations.directions}
          </ButtonLink>
        )}
      </header>

      {demo && (
        <Alert tone="warning" title={d.errors.sampleData} className="mt-6">
          {d.stations.demoBody}
        </Alert>
      )}

      {station.description && <p className="mt-6 text-sm text-muted">{station.description}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{d.stations.connectorsTitle}</CardTitle>
            </CardHeader>
            <CardBody>
              <ConnectorList connectors={station.connectors} locale={locale} />
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
                ariaLabel={format(d.stations.mapOf, { name: station.name })}
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{d.stations.detailsTitle}</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="space-y-3 text-sm">
                <Detail label={d.stations.price}>
                  {station.tariffPerKwh === undefined
                    ? d.stations.notPublished
                    : format(d.stations.perKwh, {
                        price: formatMoney(station.tariffPerKwh, intl),
                      })}
                </Detail>
                <Detail label={d.stations.hardware}>
                  {[station.vendor, station.model].filter(Boolean).join(' ') ||
                    d.stations.notPublished}
                </Detail>
                <Detail label={d.stations.chargePoint}>
                  <span className="font-mono text-xs">{station.cpId ?? station.id}</span>
                </Detail>
                <Detail label={d.stations.lastSeen}>
                  {station.isOnline ? d.stations.onlineNow : formatDateTime(station.lastSeenAt, intl)}
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

          <ChargingFlow
            stationId={station.id}
            connectors={station.connectors}
            availability={station.availability}
            tariffPerKwh={station.tariffPerKwh}
            signedIn={Boolean(user)}
            hasIdTag={Boolean(user?.idTag)}
            remoteStartEnabled={serverEnv.enableRemoteStart()}
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

async function StationUnavailable({ id }: { id: string }) {
  const { d } = await getTranslations();

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Alert tone="danger" title={d.stations.unreachableTitle}>
        <span className="font-mono text-xs">{id}</span> — {d.stations.unreachableBody}
      </Alert>
      <div className="mt-6 flex flex-wrap gap-2">
        <ButtonLink href="/stations">{d.stations.backToAll}</ButtonLink>
        <ButtonLink href="/help" variant="secondary">
          {d.nav.help}
        </ButtonLink>
      </div>
    </div>
  );
}
