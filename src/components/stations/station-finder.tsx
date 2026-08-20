'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Alert, Button, Field, Input, Select } from '@/components/ui';
import { format, useI18n } from '@/components/i18n-provider';
import { CONNECTOR_TYPES, type Station } from '@/lib/types';
import { cn, formatPowerKw, intlLocale } from '@/lib/utils';
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

/** Status filter values; the labels come from the availability dictionary. */
const STATUS_OPTIONS: StationStatusFilter[] = ['all', 'available', 'busy', 'offline'];

/** Power thresholds in kW; the label is built from the localised unit. */
const POWER_OPTIONS = [0, 22, 50, 100, 150];

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

type GeoErrorKey = 'geoDenied' | 'geoTimeout' | 'geoFailed';

/** Which dictionary key explains this geolocation failure. */
function geolocationMessage(error: GeolocationPositionError): GeoErrorKey {
  if (error.code === error.PERMISSION_DENIED) return 'geoDenied';
  if (error.code === error.TIMEOUT) return 'geoTimeout';
  return 'geoFailed';
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

  const { d, locale } = useI18n();
  const intl = intlLocale(locale);

  const [filters, setFilters] = useState<StationFilters>(initialFilters);
  const [stations, setStations] = useState<Station[]>(initialStations);
  const [demo, setDemo] = useState(initialDemo);
  const [warning, setWarning] = useState<string | undefined>(initialWarning);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<GeoErrorKey | 'geoUnsupported' | null>(null);
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

      fetch(`/app-api/stations${query ? `?${query}` : ''}`, { signal: controller.signal })
        .then(async (res) => {
          const payload = (await res.json().catch(() => ({}))) as StationsResponse;
          if (!res.ok) throw new Error(payload.error ?? d.errors.stationsFailed);
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
          setError(err instanceof Error ? err.message : d.errors.stationsFailed);
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
      setGeoError('geoUnsupported');
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
    ? d.stations.updating
    : format(d.stations.countStations, { count: stations.length }) +
      (filters.origin ? d.stations.nearestFirst : '');

  return (
    <div className="space-y-6">
      <form
        role="search"
        onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
        className="rounded-2xl bg-surface p-4 ring-1 ring-border shadow-[var(--shadow-card)]"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label={d.stations.searchLabel}
            htmlFor="station-search"
            className="sm:col-span-2 lg:col-span-1"
          >
            <Input
              id="station-search"
              type="search"
              value={filters.search}
              placeholder={d.stations.searchPlaceholder}
              autoComplete="off"
              onChange={(event) =>
                setFilters((current) => ({ ...current, search: event.target.value }))
              }
            />
          </Field>

          <Field label={d.stations.statusLabel} htmlFor="station-status">
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
                <option key={option} value={option}>
                  {option === 'all' ? d.stations.anyStatus : d.status.availability[option]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={d.stations.connectorLabel} htmlFor="station-connector">
            <Select
              id="station-connector"
              value={filters.connectorType}
              onChange={(event) =>
                setFilters((current) => ({ ...current, connectorType: event.target.value }))
              }
            >
              <option value="">{d.stations.anyConnector}</option>
              {CONNECTOR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={d.stations.minPowerLabel} htmlFor="station-power">
            <Select
              id="station-power"
              value={String(filters.minPowerKw)}
              onChange={(event) =>
                setFilters((current) => ({ ...current, minPowerKw: Number(event.target.value) }))
              }
            >
              {POWER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === 0
                    ? d.stations.anyPower
                    : format(d.stations.powerOrMore, { power: formatPowerKw(option, intl) })}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={locate} loading={locating}>
            {d.stations.nearMe}
          </Button>
          {filters.origin && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFilters((current) => ({ ...current, origin: null }))}
            >
              {d.stations.stopSortingByDistance}
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
              {d.stations.clearFilters}
            </Button>
          )}
        </div>

        {geoError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {d.stations[geoError]}
          </p>
        )}
      </form>

      {demo && warning && (
        <Alert tone="warning" title={d.errors.sampleData}>
          {warning}
        </Alert>
      )}

      {error && (
        <Alert tone="danger" title={d.errors.stationsFailed}>
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {countLabel}
        </p>

        <div
          role="group"
          aria-label={d.stations.resultView}
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
              {option === 'list' ? d.stations.list : d.stations.map}
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
  const { locale } = useI18n();

  return (
    <ul className={cn('grid', className)}>
      {stations.map((station) => (
        <li
          key={station.id}
          // Hover and keyboard focus pan the map; the click itself opens the station.
          onMouseEnter={() => onHighlight(station.id)}
          onFocus={() => onHighlight(station.id)}
        >
          <StationCard
            station={station}
            selected={station.id === selectedId}
            locale={locale}
          />
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
  const { d } = useI18n();

  return (
    <div className="rounded-2xl bg-surface px-6 py-12 text-center ring-1 ring-border shadow-[var(--shadow-card)]">
      <p className="text-base font-semibold text-foreground">{d.stations.noMatchTitle}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        {hasFilters ? d.stations.noMatchFiltered : d.home.noStations}
      </p>
      {hasFilters && (
        <Button type="button" variant="secondary" className="mt-5" onClick={onClear}>
          {d.stations.clearFilters}
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
  const { d } = useI18n();
  const [search, setSearch] = useState('');
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<GeoErrorKey | 'geoUnsupported' | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = search.trim();
    router.push(term ? `/stations?search=${encodeURIComponent(term)}` : '/stations');
  }

  function locate() {
    setGeoError(null);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('geoUnsupported');
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
            {d.stations.searchAria}
          </label>
          <Input
            id="home-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={d.stations.quickPlaceholder}
            autoComplete="off"
            className="h-12"
          />
        </div>
        <Button type="submit" size="lg">
          {d.stations.findChargers}
        </Button>
        <Button type="button" size="lg" variant="secondary" onClick={locate} loading={locating}>
          {d.stations.useMyLocation}
        </Button>
      </form>

      {geoError && (
        <p role="alert" className="text-sm text-danger">
          {d.stations[geoError]}
        </p>
      )}
    </div>
  );
}
