'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button, Input, SelectMenu } from '@/components/ui';
import { format, useI18n } from '@/components/i18n-provider';
import { CONNECTOR_TYPES, type Station } from '@/lib/types';
import { cn, formatPowerKw, intlLocale } from '@/lib/utils';
import { StationCard } from './station-card';
import type { StationMapProps } from './station-map';

const DEBOUNCE_MS = 300;

/** Active = online (free or busy); inactive = offline. */
export type StationStatusFilter = 'all' | 'online' | 'offline';

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
const STATUS_OPTIONS: StationStatusFilter[] = ['all', 'online', 'offline'];

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
  error?: string;
}

interface StationFinderProps {
  initialStations: Station[];
  initialFilters: StationFilters;
  initialError?: string;
}

export function StationFinder({
  initialStations,
  initialFilters,
  initialError,
}: StationFinderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { d, locale } = useI18n();
  const intl = intlLocale(locale);

  const [filters, setFilters] = useState<StationFilters>(initialFilters);
  const [stations, setStations] = useState<Station[]>(initialStations);
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

      // The API has no "online" status; that one is filtered on this page.
      const apiQuery = new URLSearchParams(query);
      if (apiQuery.get('status') === 'online') apiQuery.delete('status');
      const qs = apiQuery.toString();
      fetch(`/app-api/stations${qs ? `?${qs}` : ''}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          const payload = (await res.json().catch(() => ({}))) as StationsResponse;
          if (!res.ok) throw new Error(payload.error ?? d.errors.stationsFailed);
          return payload;
        })
        .then((payload) => {
          loadedQuery.current = query;
          setStations(payload.stations ?? []);
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
          origin: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        }));
      },
      (err) => {
        setLocating(false);
        setGeoError(geolocationMessage(err));
      },
      GEO_OPTIONS,
    );
  }

  const visible =
    filters.status === 'online'
      ? stations.filter((station) => station.availability !== 'offline')
      : stations;

  const countLabel = loading
    ? d.stations.updating
    : format(d.stations.countStations, { count: visible.length }) +
      (filters.origin ? d.stations.nearestFirst : '');

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <form
        role="search"
        onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
        className="space-y-3 rounded-2xl bg-surface p-3 ring-1 ring-border shadow-[var(--shadow-card)] sm:p-4"
      >
        {/* One row on wide screens: search, status, plug, power, near me.
            Narrower: search + near me, then status, then the two menus. */}
        <div className="flex flex-col gap-2.5">
          {/* Row 1: search, near me, list / map. */}
          <div className="flex min-w-0 gap-2">
            <label htmlFor="station-search" className="sr-only">
              {d.stations.searchLabel}
            </label>
            <div className="relative min-w-0 flex-1">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m20 20-3.5-3.5" />
              </svg>
              <Input
                id="station-search"
                type="search"
                value={filters.search}
                placeholder={d.stations.searchPlaceholder}
                autoComplete="off"
                className="h-11 pl-10"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
              />
            </div>
            <Button
              type="button"
              variant={filters.origin ? 'primary' : 'secondary'}
              onClick={locate}
              loading={locating}
              aria-label={d.stations.nearMe}
              title={d.stations.nearMe}
              className="h-11 shrink-0 gap-1.5 px-3.5"
            >
              {!locating && (
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m12 21 8-18-18 8 7 3 3 7Z"
                  />
                </svg>
              )}
              <span className="hidden sm:inline">{d.stations.nearMe}</span>
            </Button>
            <div
              role="group"
              aria-label={d.stations.resultView}
              className="inline-flex h-11 shrink-0 rounded-xl bg-surface-muted p-1 ring-1 ring-border"
            >
              {(['list', 'map'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={view === option}
                  title={option === 'list' ? d.stations.list : d.stations.map}
                  onClick={() => changeView(option)}
                  className={cn(
                    'inline-flex h-full items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition',
                    view === option
                      ? 'bg-surface text-foreground shadow-[var(--shadow-card)]'
                      : 'text-muted hover:text-foreground',
                  )}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="size-4"
                  >
                    {option === 'list' ? (
                      <path
                        strokeLinecap="round"
                        d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
                      />
                    ) : (
                      <path
                        strokeLinejoin="round"
                        d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14"
                      />
                    )}
                  </svg>
                  <span className="hidden sm:inline">
                    {option === 'list' ? d.stations.list : d.stations.map}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: status, plug type, power. */}
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
            <div
              role="radiogroup"
              aria-label={d.stations.statusLabel}
              className="grid h-11 shrink-0 grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1 ring-1 ring-border sm:min-w-[22rem]"
            >
              {STATUS_OPTIONS.map((option) => {
                const active = filters.status === option;
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFilters((current) => ({ ...current, status: option }))}
                    className={cn(
                      'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition',
                      active
                        ? 'bg-surface text-foreground shadow-[var(--shadow-card)]'
                        : 'text-muted hover:text-foreground',
                    )}
                  >
                    {option !== 'all' && (
                      <span
                        aria-hidden
                        className={cn(
                          'size-2 rounded-full',
                          option === 'online' ? 'bg-emerald-500' : 'bg-red-500',
                        )}
                      />
                    )}
                    {option === 'all'
                      ? d.stations.anyStatus
                      : option === 'online'
                        ? d.headerStatus.online
                        : d.headerStatus.offline}
                  </button>
                );
              })}
            </div>

            <div className="grid flex-1 grid-cols-2 gap-2">
              <SelectMenu
                id="station-connector"
                label={d.stations.connectorLabel}
                value={filters.connectorType}
                className="[&>button]:h-11"
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    connectorType: value,
                  }))
                }
                options={[
                  { value: '', label: d.stations.anyConnector },
                  ...CONNECTOR_TYPES.map((type) => ({
                    value: type,
                    label: type,
                  })),
                ]}
              />
              <SelectMenu
                id="station-power"
                label={d.stations.minPowerLabel}
                value={String(filters.minPowerKw)}
                className="[&>button]:h-11"
                onChange={(value) =>
                  setFilters((current) => ({
                    ...current,
                    minPowerKw: Number(value),
                  }))
                }
                options={POWER_OPTIONS.map((option) => ({
                  value: String(option),
                  label:
                    option === 0
                      ? d.stations.anyPower
                      : format(d.stations.powerOrMore, {
                          power: formatPowerKw(option, intl),
                        }),
                }))}
              />
            </div>
          </div>
        </div>

        {(filters.origin || hasFilters) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            {filters.origin && (
              <button
                type="button"
                onClick={() => setFilters((current) => ({ ...current, origin: null }))}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand/10 px-3 text-xs font-semibold text-brand ring-1 ring-brand/25 hover:bg-brand/15"
              >
                {d.stations.stopSortingByDistance} ✕
              </button>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setGeoError(null);
                  setFilters(EMPTY_FILTERS);
                }}
                className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold text-muted hover:text-foreground"
              >
                ✕ {d.stations.clearFilters}
              </button>
            )}
          </div>
        )}

        {geoError && (
          <p role="alert" className="text-sm text-danger">
            {d.stations[geoError]}
          </p>
        )}
      </form>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl bg-danger/10 px-4 py-3 ring-1 ring-danger/25"
        >
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-danger/15 text-danger"
          >
            !
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-danger">{d.errors.stationsFailed}</p>
            <p className="mt-0.5 text-xs text-muted">{error}</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            {d.common.retry}
          </Button>
        </div>
      )}

      <p className="text-sm font-medium text-muted" aria-live="polite">
        {countLabel}
      </p>

      {loading ? (
        <ResultsSkeleton view={view} />
      ) : visible.length === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onClear={() => {
            setGeoError(null);
            setFilters(EMPTY_FILTERS);
          }}
        />
      ) : view === 'map' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] min-w-0 max-w-full overflow-hidden">
          <div className="h-[60vh] sm:h-[70vh] min-w-0 max-w-full overflow-hidden rounded-2xl">
            <StationMapPanel stations={visible} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <StationList
            stations={visible}
            selectedId={selectedId}
            onHighlight={setSelectedId}
            className="auto-rows-max grid-cols-1 gap-3 lg:max-h-[70vh] lg:snap-y lg:snap-proximity lg:overflow-y-auto lg:scroll-pt-1 lg:pr-1 min-w-0 max-w-full"
          />
        </div>
      ) : (
        <StationList
          stations={visible}
          selectedId={selectedId}
          onHighlight={setSelectedId}
          className="grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 min-w-0 max-w-full"
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
    <ul className={cn('grid min-w-0 max-w-full', className)}>
      {stations.map((station) => (
        <li
          key={station.id}
          className="snap-start scroll-mt-1 min-w-0 max-w-full overflow-hidden"
          // Hover and keyboard focus pan the map; the click itself opens the station.
          onMouseEnter={() => onHighlight(station.id)}
          onFocus={() => onHighlight(station.id)}
        >
          <StationCard station={station} selected={station.id === selectedId} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

function ResultsSkeleton({ view }: { view: 'list' | 'map' }) {
  if (view === 'map') {
    return (
      <div className="h-[60vh] animate-pulse rounded-2xl bg-surface-muted sm:h-[70vh] min-w-0 max-w-full" />
    );
  }
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 min-w-0 max-w-full"
      aria-hidden
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-48 animate-pulse rounded-2xl bg-surface ring-1 ring-border min-w-0 max-w-full"
        />
      ))}
    </div>
  );
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  const { d } = useI18n();

  return (
    <div className="rounded-2xl bg-surface px-6 py-12 text-center ring-1 ring-border shadow-[var(--shadow-card)]">
      <span
        aria-hidden
        className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-surface-muted text-muted"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-6"
        >
          <path
            strokeLinejoin="round"
            d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h14M15 9h2a2 2 0 0 1 2 2v5a1.5 1.5 0 0 0 3 0V8l-3-3M9 8l-2 4h4l-2 4"
          />
        </svg>
      </span>
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
