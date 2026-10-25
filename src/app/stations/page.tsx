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

  let result: StationResult = { stations: [], demo: false };
  let loadError: string | undefined;
  try {
    result = await listStations({ ...query, connectorType: connectorType || undefined });
  } catch (err) {
    console.error('[stations] initial load failed', err);
    loadError = d.errors.networkUnreachable;
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
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5 sm:py-10 min-w-0 max-w-full overflow-hidden">
      <header className="mb-4 sm:mb-6 min-w-0 max-w-full">
        <h1 className="truncate text-xl sm:text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {d.stations.title}
        </h1>
      </header>

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
    <div className="space-y-4 sm:space-y-6 min-w-0 max-w-full" aria-hidden>
      <div className="h-44 animate-pulse rounded-2xl bg-surface ring-1 ring-border sm:h-32 min-w-0 max-w-full" />
      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 min-w-0 max-w-full">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-48 animate-pulse rounded-2xl bg-surface ring-1 ring-border min-w-0 max-w-full" />
        ))}
      </div>
    </div>
  );
}
