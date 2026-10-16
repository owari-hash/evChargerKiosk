import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ChargingFlow } from '@/components/stations/charging-flow';
import { Alert, ButtonLink } from '@/components/ui';
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
  // only as far as "a positive integer"; the flow ignores one that is not free.
  const requested = Number(Array.isArray(query.connector) ? query.connector[0] : query.connector);
  const initialConnectorId =
    Number.isInteger(requested) && requested > 0 ? requested : undefined;
  const intl = intlLocale(locale);

  if (!station) {
    if (!unreachable) notFound();
    return <StationUnavailable id={id} />;
  }

  // Sign-in comes back here with the sticker's `?connector=N&via=qr` intact.
  const keep = new URLSearchParams();
  for (const key of ['connector', 'via']) {
    const value = query[key];
    if (typeof value === 'string' && value) keep.set(key, value);
  }
  const returnTo = `/stations/${encodeURIComponent(station.id)}${keep.size ? `?${keep}` : ''}`;

  const user = await getCurrentUser();
  const directions = directionsUrl(station);

  const facts = [
    station.maxPowerKw
      ? format(d.stations.upToPower, { power: formatPowerKw(station.maxPowerKw, intl) })
      : undefined,
    station.tariffPerKwh === undefined
      ? undefined
      : format(d.stations.perKwh, { price: formatMoney(station.tariffPerKwh, intl, 2) }),
  ].filter(Boolean);
  const feeNote =
    station.tariffPerKwh !== undefined && station.feePercent
      ? format(d.stations.feeIncluded, { percent: station.feePercent })
      : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:py-8">
      <Link
        href="/stations"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-brand"
      >
        {d.stations.allChargers}
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {station.name}
        </h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="min-w-0 break-words">{station.address || d.stations.addressMissing}</span>
          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="m12 21 8-18-18 8 7 3 3 7Z" />
              </svg>
              {d.stations.directions}
            </a>
          )}
        </p>
        {facts.length > 0 && (
          <p className="mt-2 text-sm font-medium text-foreground">
            {facts.map((fact, i) => (
              <span key={fact} className="whitespace-nowrap">
                {i > 0 && ' · '}
                {fact}
              </span>
            ))}
            {feeNote && <span className="ml-1.5 text-xs font-normal text-muted">({feeNote})</span>}
          </p>
        )}
        {station.description && (
          <p className="mt-1 text-sm leading-6 text-muted">{station.description}</p>
        )}
      </header>

      <div className="mt-5">
        <ChargingFlow
          stationId={station.id}
          connectors={station.connectors}
          availability={station.availability}
          tariffPerKwh={station.tariffPerKwh}
          lastSeenLabel={
            station.isOnline || !station.lastSeenAt
              ? undefined
              : formatDateTime(station.lastSeenAt, intl)
          }
          signedIn={Boolean(user)}
          hasIdTag={Boolean(user?.idTag)}
          remoteStartEnabled={remoteStartEnabled}
          initialConnectorId={initialConnectorId}
          returnTo={returnTo}
        />
      </div>
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
