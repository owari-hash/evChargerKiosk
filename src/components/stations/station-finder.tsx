'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Alert, Button, Field, Input, Select } from '@/components/ui';
import { CONNECTOR_TYPES, type Station } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StationCard } from './station-card';
import type { StationMapProps } from './station-map';

const DEBOUNCE_MS = 300;

export type StationStatusFilter = 'all' | 'available' | 'busy' | 'offline';

export interface StationFilters {
  search: string;
  status: StationStatusFilter;
  connectorType: string;
  minPowerKw: number;
  origin: { lat: number; lng: number } | null;
}

export const EMPTY_FILTERS: StationFilters = {
  search: '',
  status: 'all',
  connectorType: '',
  minPowerKw: 0,
  origin: null,
};

const STATUS_OPTIONS: Array<{ value: StationStatusFilter; label: string }> = [
  { value: 'all', label: 'Any status' },
  { value: 'available', label: 'Available now' },
  { value: 'busy', label: 'All plugs in use' },
  { value: 'offline', label: 'Offline' },
];

const POWER_OPTIONS = [
  { value: 0, label: 'Any power' },
  { value: 22, label: '22 kW or more' },
  { value: 50, label: '50 kW or more' },
  { value: 100, label: '100 kW or more' },
  { value: 150, label: '150 kW or more' },
];

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 5 * 60_000,
};

/**
 * Leaflet reads `window` while it is being imported, so the map is only ever
 * pulled into the client bundle. The wrapper is exported from this client module
 * because `ssr: false` is rejected inside a server component, and the station
 * detail page — a server component — needs a map of its own.
 */
const LazyStationMap = dynamic(() => import('./station-map').then((m) => m.StationMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-surface-muted" />,
});

export function StationMapPanel(props: StationMapProps) {
  return <LazyStationMap {...props} />;
}

function buildQuery(filters: StationFilters): string {
  const params = new URLSearchParams();
  const search = filters.search.trim();
  if (search) params.set('search', search);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.connectorType) params.set('connectorType', filters.connectorType);
  if (filters.minPowerKw > 0) params.set('minPowerKw', String(filters.minPowerKw));
  if (filters.origin) {
    params.set('lat', filters.origin.lat.toFixed(5));
    params.set('lng', filters.origin.lng.toFixed(5));
  }
  return params.toString();
}

function geolocationMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location sharing is turned off for this site. Search by name instead.';
  }
  if (error.code === error.TIMEOUT) {
    return 'Finding your location took too long. Try again or search by name.';
  }
  return 'We could not work out where you are. Search by name instead.';
}

interface StationsResponse {
  stations?: Station[];
  demo?: boolean;
  warning?: string;
  error?: string;
}

interface StationFinderProps {
  initialStations: Station[];
  initialFilters: StationFilters;
  initialDemo?: boolean;
  initialWarning?: string;
  initialError?: string;
}

export function StationFinder({
  initialStations,
  initialFilters,
  initialDemo = false,
  initialWarning,
  initialError,
}: StationFinderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<StationFilters>(initialFilters);
  const [stations, setStations] = useState<Station[]>(initialStations);
  const [demo, setDemo] = useState(initialDemo);
  const [warning, setWarning] = useState<string | undefined>(initialWarning);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const view = searchParams.get('view') === 'map' ? 'map' : 'list';
  const query = useMemo(() => buildQuery(filters), [filters]);
  const hasFilters = query !== '';

  // Whatever `stations` currently reflects, so a filter that returns to its
  // starting value still triggers a refresh.
  const loadedQuery = useRef(query);

  useEffect(() => {
    const params = new URLSearchParams(query);
    if (view === 'map') params.set('view', 'map');
    const next = params.toString();
    const url = next ? `${pathname}?${next}` : pathname;
    if (`${window.location.pathname}${window.location.search}` !== url) {
      // Filters are synced without a server round-trip; the list is refreshed
      // from /api/stations below.
      window.history.replaceState(null, '', url);
    }
  }, [query, view, pathname]);

  useEffect(() => {
    // Reverting a filter while its request is still in flight lands here: the
    // list already shows this query, so cancel out of the pending load.
    if (loadedQuery.current === query) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      fetch(`/api/stations${query ? `?${query}` : ''}`, { signal: controller.signal })
        .then(async (res) => {
          const payload = (await res.json().catch(() => ({}))) as StationsResponse;
          if (!res.ok) throw new Error(payload.error ?? 'Stations could not be loaded');
          return payload;
        })
        .then((payload) => {
          loadedQuery.current = query;
          setStations(payload.stations ?? []);
          setDemo(Boolean(payload.demo));
          setWarning(payload.warning);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError(err instanceof Error ? err.message : 'Stations could not be loaded');
          setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function changeView(next: 'list' | 'map') {
    const params = new URLSearchParams(query);
    if (next === 'map') params.set('view', 'map');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function locate() {
    setGeoError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('This browser cannot share a location. Search by name instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setFilters((current) => ({
          ...current,
          origin: { lat: position.coords.latitude, lng: position.coords.longitude },
        }));
      },
      (err) => {
        setLocating(false);
        setGeoError(geolocationMessage(err));
      },
      GEO_OPTIONS,
    );
  }

  const countLabel = loading
    ? 'Updating results'
    : `${stations.length} ${stations.length === 1 ? 'station' : 'stations'}${
        filters.origin ? ', nearest first' : ''
      }`;

  return (
    <div className="space-y-6">
      <form
        role="search"
        onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
        className="rounded-2xl bg-surface p-4 ring-1 ring-border shadow-[var(--shadow-card)]"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search" htmlFor="station-search" className="sm:col-span-2 lg:col-span-1">
            <Input
              id="station-search"
              type="search"
              value={filters.search}
              placeholder="Name, address or tag"
              autoComplete="off"
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
            />
          </Field>

          <Field label="Status" htmlFor="station-status">
            <Select
              id="station-status"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value as StationStatusFilter,
                }))
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Connector" htmlFor="station-connector">
            <Select
              id="station-connector"
              value={filters.connectorType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, connectorType: event.target.value }))
              }
            >
              <option value="">Any connector</option>
              {CONNECTOR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Minimum power" htmlFor="station-power">
            <Select
              id="station-power"
              value={String(filters.minPowerKw)}
              onChange={(event) =>
                setFilters((current) => ({ ...current, minPowerKw: Number(event.target.value) }))
              }
            >
              {POWER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={locate} loading={locating}>
            Near me
          </Button>
          {filters.origin && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFilters((current) => ({ ...current, origin: null }))}
            >
              Stop sorting by distance
            </Button>
          )}
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setGeoError(null);
                setFilters(EMPTY_FILTERS);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {geoError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {geoError}
          </p>
        )}
      </form>

      {demo && warning && (
        <Alert tone="warning" title="Sample data">
          {warning}
        </Alert>
      )}

      {error && (
        <Alert tone="danger" title="Stations could not be loaded">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {countLabel}
        </p>

        <div
          role="group"
          aria-label="Result view"
          className="inline-flex rounded-xl bg-surface-muted p-1 ring-1 ring-border"
        >
          {(['list', 'map'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => changeView(option)}
              className={cn(
                'h-9 rounded-lg px-4 text-sm font-medium transition',
                view === option
                  ? 'bg-surface text-foreground shadow-[var(--shadow-card)]'
                  : 'text-muted hover:text-foreground',
              )}
            >
              {option === 'list' ? 'List' : 'Map'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ResultsSkeleton view={view} />
      ) : stations.length === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onClear={() => {
            setGeoError(null);
            setFilters(EMPTY_FILTERS);
          }}
        />
      ) : view === 'map' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-[60vh] sm:h-[70vh]">
            <StationMapPanel
              stations={stations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
          <StationList
            stations={stations}
            selectedId={selectedId}
            onHighlight={setSelectedId}
            className="gap-3 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1"
          />
        </div>
      ) : (
        <StationList
          stations={stations}
          selectedId={selectedId}
          onHighlight={setSelectedId}
          className="gap-4 sm:grid-cols-2 xl:grid-cols-3"
        />
      )}
    </div>
  );
}

interface StationListProps {
  stations: Station[];
  selectedId: string | null;
  onHighlight: (id: string) => void;
  className?: string;
}

function StationList({ stations, selectedId, onHighlight, className }: StationListProps) {
  return (
    <ul className={cn('grid', className)}>
      {stations.map((station) => (
        <li
          key={station.id}
          // Hover and keyboard focus pan the map; the click itself opens the station.
          onMouseEnter={() => onHighlight(station.id)}
          onFocus={() => onHighlight(station.id)}
        >
          <StationCard station={station} selected={station.id === selectedId} />
        </li>
      ))}
    </ul>
  );
}

function ResultsSkeleton({ view }: { view: 'list' | 'map' }) {
  if (view === 'map') {
    return <div className="h-[60vh] animate-pulse rounded-2xl bg-surface-muted sm:h-[70vh]" />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-48 animate-pulse rounded-2xl bg-surface ring-1 ring-border"
        />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="rounded-2xl bg-surface px-6 py-12 text-center ring-1 ring-border shadow-[var(--shadow-card)]">
      <p className="text-base font-semibold text-foreground">No stations match this search</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {hasFilters
          ? 'Try a wider power range, a different connector, or clear the filters to see the whole network.'
          : 'No charge points are being reported right now. Please try again shortly.'}
      </p>
      {hasFilters && (
        <Button type="button" variant="secondary" className="mt-5" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

/**
 * The two hero controls on the home page: a search box and a geolocation button,
 * both of which simply hand off to the finder.
 */
export function StationQuickSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = search.trim();
    router.push(term ? `/stations?search=${encodeURIComponent(term)}` : '/stations');
  }

  function locate() {
    setGeoError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('This browser cannot share a location. Search by name instead.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        router.push(`/stations?lat=${lat}&lng=${lng}`);
      },
      (err) => {
        setLocating(false);
        setGeoError(geolocationMessage(err));
      },
      GEO_OPTIONS,
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <form role="search" onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="home-search" className="sr-only">
            Search for a charging station
          </label>
          <Input
            id="home-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by place, address or network"
            autoComplete="off"
            className="h-12"
          />
        </div>
        <Button type="submit" size="lg">
          Find chargers
        </Button>
        <Button type="button" size="lg" variant="secondary" onClick={locate} loading={locating}>
          Use my location
        </Button>
      </form>

      {geoError && (
        <p role="alert" className="text-sm text-danger">
          {geoError}
        </p>
      )}
    </div>
  );
}
