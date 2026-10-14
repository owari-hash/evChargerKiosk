import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';
import { AvailabilityStatus } from '@/components/stations/availability-dot';
import { StationLiveView } from '@/components/stations/station-live-view';
import { StationMapPanel } from '@/components/stations/station-finder';
import { Alert, Badge, ButtonLink, Card, CardBody, CardHeader, CardTitle } from '@/components/ui';
import { getCurrentUser, getStation } from '@/lib/driver-api';
import { format, getTranslations } from '@/lib/i18n';
import type { Station } from '@/lib/types';
import { directionsUrl, formatDateTime, formatMoney, formatPowerKw, intlLocale } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface StationPageLoad {
  station: Station | null;
  remoteStartEnabled: boolean;
  /** The API could not be asked, as opposed to answering that there is no such station. */
  unreachable: boolean;
}

/** Deduplicates the API call shared by generateMetadata() and the page itself. */
const loadStation = cache(async (id: string): Promise<StationPageLoad> => {
  try {
    const { station, remoteStartEnabled } = await getStation(id);
    return { station, remoteStartEnabled, unreachable: false };
  } catch (err) {
    console.error(`[station] failed to load ${id}`, err);
    return { station: null, remoteStartEnabled: false, unreachable: true };
  }
});

export async function generateMetadata(props: PageProps<'/stations/[id]'>): Promise<Metadata> {
  const { id } = await props.params;
  const [{ station }, { d }] = await Promise.all([loadStation(id), getTranslations()]);
  return { title: station?.name ?? d.stations.chargePoint };
}

export default async function StationPage(props: PageProps<'/stations/[id]'>) {
  const [{ id }, query, { locale, d }] = await Promise.all([
    props.params,
    props.searchParams,
    getTranslations(),
  ]);
  const { station, unreachable, remoteStartEnabled } = await loadStation(id);

  // `?connector=` is set by the QR sticker on a gun (see /c/[code]). Trust it
  // only as far as "a positive integer"; the picker ignores one that is not here.
  const requested = Number(Array.isArray(query.connector) ? query.connector[0] : query.connector);
  const initialConnectorId =
    Number.isInteger(requested) && requested > 0 ? requested : undefined;
  const intl = intlLocale(locale);

  if (!station) {
    if (!unreachable) notFound();
    return <StationUnavailable id={id} />;
  }

  const user = await getCurrentUser();
  const directions = directionsUrl(station);
  const hasCoordinates = station.latitude !== undefined && station.longitude !== undefined;
  const hardware = [station.vendor, station.model].filter(Boolean).join(' ');

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:py-8">
      <Link
        href="/stations"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-brand"
      >
        {d.stations.allChargers}
      </Link>

      <header className="mt-4 overflow-hidden rounded-3xl bg-surface shadow-[var(--shadow-card)] ring-1 ring-border">
        <div className="grid lg:min-h-[320px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground ring-1 ring-border">
                <AvailabilityStatus
                  availability={station.availability}
                  locale={locale}
                  className="text-xs font-semibold"
                />
              </span>
              <span className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-medium text-muted ring-1 ring-border">
                {format(d.stations.plugsFree, {
                  available: station.availableConnectors,
                  total: station.totalConnectors,
                })}
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {station.name}
            </h1>
            <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-muted sm:text-base">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-1 size-4 shrink-0 text-brand" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {station.address || d.stations.addressMissing}
            </p>
            {station.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                {station.description}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-3">
              <HeroStat
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 4.5 13h6l-.5 9 9-12h-6l.5-8Z" />
                  </svg>
                }
                label={d.stations.maxPower}
                value={
                  station.maxPowerKw
                    ? formatPowerKw(station.maxPowerKw, intl)
                    : d.stations.notPublished
                }
              />
              <HeroStat
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
                    <rect x="3" y="5" width="18" height="15" rx="2" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18m-6 5h2" />
                  </svg>
                }
                label={d.stations.price}
                value={
                  station.tariffPerKwh === undefined
                    ? d.stations.notPublished
                    : format(d.stations.perKwh, {
                        price: formatMoney(station.tariffPerKwh, intl, 2),
                      })
                }
              />
              {hardware && (
                <HeroStat
                  className="col-span-2 sm:col-span-1"
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7V3m10 4V3M5 7h14v5a7 7 0 0 1-14 0V7Zm7 12v2m-4 0h8" />
                    </svg>
                  }
                  label={d.stations.hardware}
                  value={hardware}
                />
              )}
            </div>

            {directions && (
              <ButtonLink
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 w-fit gap-2"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m12 21 8-18-18 8 7 3 3 7Z" />
                </svg>
                {d.stations.directions}
              </ButtonLink>
            )}
          </div>

          <div className="relative h-64 border-t border-border bg-surface-muted sm:h-80 lg:h-auto lg:min-h-full lg:border-l lg:border-t-0">
            {hasCoordinates ? (
              <StationMapPanel
                stations={[station]}
                selectedId={station.id}
                fitToStations={false}
                zoom={15}
                scrollWheelZoom={false}
                ariaLabel={format(d.stations.mapOf, { name: station.name })}
              />
            ) : (
              <div className="grid h-full place-items-center px-6 text-center">
                <div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto size-8 text-brand" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {d.stations.addressMissing}
                  </p>
                </div>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/30 to-transparent" />
          </div>
        </div>
      </header>

      <StationLiveView
        stationId={station.id}
        initialConnectors={station.connectors}
        initialConnectorId={initialConnectorId}
        availability={station.availability}
        tariffPerKwh={station.tariffPerKwh}
        signedIn={Boolean(user)}
        hasIdTag={Boolean(user?.idTag)}
        remoteStartEnabled={remoteStartEnabled}
        locale={locale}
        connectorsTitle={d.stations.connectorsTitle}
        detailsSlot={
          <Card className="flex h-full flex-col">
            <CardHeader>
              <CardTitle>{d.stations.detailsTitle}</CardTitle>
            </CardHeader>
            <CardBody className="flex-1">
              <dl className="space-y-3 text-sm">
                <Detail label={d.stations.price}>
                  {station.tariffPerKwh === undefined
                    ? d.stations.notPublished
                    : format(d.stations.perKwh, {
                        price: formatMoney(station.tariffPerKwh, intl, 2),
                      })}
                  {station.feePercent != null && station.feePercent > 0 && (
                    <span className="mt-0.5 block text-xs font-normal text-muted">
                      {format(d.stations.feeIncluded, { percent: station.feePercent })}
                    </span>
                  )}
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
        }
      />
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 rounded-2xl bg-surface-muted/70 p-3 ring-1 ring-border ${className ?? ''}`}>
      <div className="flex items-center gap-1.5 text-brand">
        {icon}
        <span className="truncate text-[11px] font-medium text-muted">{label}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold text-foreground">{value}</p>
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
