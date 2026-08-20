import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
  StationFinder,
  type StationFilters,
  type StationStatusFilter,
} from '@/components/stations/station-finder';
import { listStations, type StationResult } from '@/lib/csms/stations';
import { CONNECTOR_TYPES } from '@/lib/types';
import { stationQuerySchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Find a charger',
  description:
    'Search the charging network by name, connector and power, and see which plugs are free right now.',
};

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
  const searchParams = await props.searchParams;
  const parsed = stationQuerySchema.safeParse(firstValues(searchParams));
  const query = parsed.success ? parsed.data : stationQuerySchema.parse({});
  const connectorType = normalizeConnectorType(query.connectorType);

  let result: StationResult = { stations: [], demo: false };
  let loadError: string | undefined;
  try {
    result = await listStations({ ...query, connectorType: connectorType || undefined });
  } catch (err) {
    console.error('[stations] initial load failed', err);
    loadError = 'The charging network is not reachable right now. Please try again shortly.';
  }

  const initialFilters: StationFilters = {
    search: query.search ?? '',
    status: query.status as StationStatusFilter,
    connectorType,
    minPowerKw: query.minPowerKw ?? 0,
    origin:
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : null,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Find a charger
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Live plug availability across the network. Filter by connector and power, or sort by how
          far away each station is.
        </p>
      </header>

      <Suspense fallback={<FinderFallback />}>
        <StationFinder
          initialStations={result.stations}
          initialFilters={initialFilters}
          initialDemo={result.demo}
          initialWarning={result.warning}
          initialError={loadError}
        />
      </Suspense>
    </div>
  );
}

function FinderFallback() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-44 animate-pulse rounded-2xl bg-surface ring-1 ring-border sm:h-32" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-2xl bg-surface ring-1 ring-border" />
        ))}
      </div>
    </div>
  );
}
