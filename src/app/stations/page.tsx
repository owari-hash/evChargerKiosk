import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  StationFinder,
  type StationFilters,
  type StationStatusFilter,
} from '@/components/stations/station-finder';
import { listStations, type StationResult } from '@/lib/driver-api';
import { CONNECTOR_TYPES } from '@/lib/types';
import { getTranslations } from '@/lib/i18n';
import { stationQuerySchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { d } = await getTranslations();
  return { title: d.stations.title, description: d.stations.metaDescription };
}

type RawParams = Record<string, string | string[] | undefined>;

function firstValues(params: RawParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) out[key] = single;
  }
  return out;
}

function normalizeConnectorType(value: string | undefined): string {
  if (!value) return '';
  const match = CONNECTOR_TYPES.find((type) => type.toLowerCase() === value.toLowerCase());
  return match ?? '';
}

export default async function StationsPage(props: PageProps<'/stations'>) {
  const [searchParams, { d }] = await Promise.all([props.searchParams, getTranslations()]);
  const parsed = stationQuerySchema.safeParse(firstValues(searchParams));
  const query = parsed.success ? parsed.data : stationQuerySchema.parse({});
  const connectorType = normalizeConnectorType(query.connectorType);
  // Old links may still say available/busy; both are "active" now.
  const status: StationStatusFilter =
    query.status === 'available' || query.status === 'busy' ? 'online' : query.status;

  let result: StationResult = { stations: [], demo: false };
  let loadError: string | undefined;
  try {
    result = await listStations({
      ...query,
      // The API has no "online"; the finder filters that itself.
      status: status === 'online' ? 'all' : status,
      connectorType: connectorType || undefined,
    });
  } catch (err) {
    console.error('[stations] initial load failed', err);
    loadError = d.errors.networkUnreachable;
  }

  const initialFilters: StationFilters = {
    search: query.search ?? '',
    status,
    connectorType,
    minPowerKw: query.minPowerKw ?? 0,
    origin:
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : null,
  };

  return (
    // Same frame as the account pages: centred, max-w-6xl. A trailing
    // `max-w-full` used to override the cap and stretch this edge to edge.
    <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-6 md:py-10">
      {/* No visible heading: the search box says what the page is for. Kept
          for screen readers and the document outline. */}
      <h1 className="sr-only">{d.stations.title}</h1>

      <Suspense fallback={<FinderFallback />}>
        <StationFinder
          initialStations={result.stations}
          initialFilters={initialFilters}
          initialError={loadError}
        />
      </Suspense>
    </div>
  );
}

function FinderFallback() {
  return (
    <div className="space-y-4 sm:space-y-5" aria-hidden>
      <div className="h-32 animate-pulse rounded-2xl bg-surface ring-1 ring-border" />
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 min-w-0 max-w-full">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-2xl bg-surface ring-1 ring-border min-w-0 max-w-full" />
        ))}
      </div>
    </div>
  );
}
