'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { format, useI18n } from '@/components/i18n-provider';
import { CONNECTOR_TYPES, type ConnectorType, type Station } from '@/lib/types';
import {
  availabilityLabel,
  availabilityTone,
  cn,
  formatDistance,
  formatMoney,
  formatPowerKw,
  formatTariff,
  haversineKm,
  intlLocale,
} from '@/lib/utils';
import type { HeroMapApi } from './hero-map';
import { toMapStations, type MapStation } from './map-station';

/**
 * Leaflet touches `window` while it is being imported, so the map is only ever
 * pulled into the client bundle — and only once the hero is on screen.
 */
const LazyHeroMap = dynamic(() => import('./hero-map').then((m) => m.HeroMap), {
  ssr: false,
  loading: () => <div className="ev-map-skeleton h-full w-full" aria-hidden />,
});

/** How often the network is re-polled while the hero is visible. */
const REFRESH_MS = 60_000;

/**
 * The sheet list is a shortcut, not the finder. Rendering every match on a large
 * network costs a row of DOM each and blocks the main thread for long enough to
 * be felt on a phone, so it stops here and points at /stations for the rest.
 */
const LIST_LIMIT = 50;

/** Ratings the network actually advertises, coarsest first on the button. */
const POWER_STEPS = [380, 240, 120, 60, 22];

/** Tariff ceilings, in ₮ per kWh. */
const PRICE_STEPS = [1000, 700, 500];

const STATUS_STEPS = ['available', 'busy', 'offline'] as const;

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 5 * 60_000,
};

type GeoErrorKey = 'geoDenied' | 'geoTimeout' | 'geoFailed' | 'geoUnsupported';

function geolocationMessage(error: GeolocationPositionError): GeoErrorKey {
  if (error.code === error.PERMISSION_DENIED) return 'geoDenied';
  if (error.code === error.TIMEOUT) return 'geoTimeout';
  return 'geoFailed';
}

type GroupKey = 'power' | 'current' | 'connector' | 'status' | 'price';

interface Filters {
  /** 0 means any rating. */
  minPowerKw: number;
  currentType: 'any' | 'dc' | 'ac';
  /** Empty means any plug type. */
  connector: ConnectorType | '';
  status: 'any' | (typeof STATUS_STEPS)[number];
  /** 0 means any tariff. */
  maxTariff: number;
}

const NO_FILTERS: Filters = {
  minPowerKw: 0,
  currentType: 'any',
  connector: '',
  status: 'any',
  maxTariff: 0,
};

/** One option inside a filter's drop-down. */
interface FilterOption {
  id: string;
  label: string;
  selected: boolean;
  apply: () => void;
}

interface FilterGroup {
  key: GroupKey;
  label: string;
  /** What the button shows underneath the label. */
  value: string;
  active: boolean;
  options: FilterOption[];
}

export interface HeroMapSectionProps {
  stations: MapStation[];
  className?: string;
}

export function HeroMapSection({ stations: initialStations, className }: HeroMapSectionProps) {
  const { d, locale } = useI18n();
  const intl = intlLocale(locale);
  const t = d.home.map;

  const [stations, setStations] = useState(initialStations);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<GeoErrorKey | null>(null);
  const [fitNonce, setFitNonce] = useState(0);

  const controlsRef = useRef<HTMLDivElement>(null);

  // The zoom buttons sit in this page's own control rail rather than in
  // Leaflet's, so the map hands its controls over once it has mounted.
  const mapApi = useRef<HeroMapApi | null>(null);
  const handleMapReady = useCallback((api: HeroMapApi) => {
    mapApi.current = api;
  }, []);

  // A station added in the admin console shows up here without a page reload.
  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/app-api/stations', { cache: 'no-store' });
        if (!res.ok) return;
        const payload = (await res.json()) as { stations?: Station[] };
        if (cancelled || !payload.stations) return;
        setStations(toMapStations(payload.stations));
      } catch {
        // A failed poll simply leaves the last good snapshot on the map.
      }
    }

    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // An open drop-down closes on Escape or on a click anywhere else — including
  // on the map, which would otherwise be steered from behind the panel.
  useEffect(() => {
    if (!openGroup) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) setOpenGroup(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenGroup(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openGroup]);

  const located = useMemo(() => {
    if (!origin) return stations;
    return stations.map((station) => ({
      ...station,
      distanceKm: haversineKm(origin, { lat: station.lat, lng: station.lng }),
    }));
  }, [stations, origin]);

  const visible = useMemo(() => {
    const matched = located.filter((station) => {
      if (filters.minPowerKw > 0 && (station.maxPowerKw ?? 0) < filters.minPowerKw) return false;
      if (filters.currentType !== 'any' && station.speed !== filters.currentType) return false;
      if (filters.connector && !station.connectorTypes.includes(filters.connector)) return false;
      if (filters.status !== 'any' && station.availability !== filters.status) return false;
      // A station with no published tariff cannot be shown to be under a ceiling.
      if (filters.maxTariff > 0 && (station.tariffPerKwh ?? Infinity) > filters.maxTariff) {
        return false;
      }
      return true;
    });

    return matched.sort((a, b) => {
      if (origin) return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      const rank = { available: 0, busy: 1, unknown: 2, offline: 3 } as const;
      if (rank[a.availability] !== rank[b.availability]) {
        return rank[a.availability] - rank[b.availability];
      }
      return a.name.localeCompare(b.name);
    });
  }, [located, filters, origin]);

  const set = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setOpenGroup(null);
  }, []);

  const groups = useMemo<FilterGroup[]>(() => {
    const anyOption = (isSelected: boolean, apply: () => void): FilterOption => ({
      id: 'any',
      label: t.optionAny,
      selected: isSelected,
      apply,
    });

    return [
      {
        key: 'power',
        label: t.groupPower,
        value:
          filters.minPowerKw > 0
            ? format(t.powerAtLeast, { power: formatPowerKw(filters.minPowerKw, intl) })
            : t.optionAny,
        active: filters.minPowerKw > 0,
        options: [
          anyOption(filters.minPowerKw === 0, () => set('minPowerKw', 0)),
          ...POWER_STEPS.map((kw) => ({
            id: String(kw),
            label: format(t.powerAtLeast, { power: formatPowerKw(kw, intl) }),
            selected: filters.minPowerKw === kw,
            apply: () => set('minPowerKw', kw),
          })),
        ],
      },
      {
        key: 'current',
        label: t.groupCurrent,
        value:
          filters.currentType === 'dc'
            ? t.currentDc
            : filters.currentType === 'ac'
              ? t.currentAc
              : t.optionAny,
        active: filters.currentType !== 'any',
        options: [
          anyOption(filters.currentType === 'any', () => set('currentType', 'any')),
          {
            id: 'dc',
            label: t.currentDc,
            selected: filters.currentType === 'dc',
            apply: () => set('currentType', 'dc'),
          },
          {
            id: 'ac',
            label: t.currentAc,
            selected: filters.currentType === 'ac',
            apply: () => set('currentType', 'ac'),
          },
        ],
      },
      {
        key: 'connector',
        label: t.groupConnector,
        value: filters.connector || t.optionAny,
        active: filters.connector !== '',
        options: [
          anyOption(filters.connector === '', () => set('connector', '')),
          ...CONNECTOR_TYPES.map((type) => ({
            id: type,
            label: type,
            selected: filters.connector === type,
            apply: () => set('connector', type),
          })),
        ],
      },
      {
        key: 'status',
        label: t.groupStatus,
        value:
          filters.status === 'any' ? t.optionAny : availabilityLabel(filters.status, locale),
        active: filters.status !== 'any',
        options: [
          anyOption(filters.status === 'any', () => set('status', 'any')),
          ...STATUS_STEPS.map((status) => ({
            id: status,
            label: availabilityLabel(status, locale),
            selected: filters.status === status,
            apply: () => set('status', status),
          })),
        ],
      },
      {
        key: 'price',
        label: t.groupPrice,
        value:
          filters.maxTariff > 0
            ? format(t.priceUpTo, { price: formatMoney(filters.maxTariff, intl) })
            : t.optionAny,
        active: filters.maxTariff > 0,
        options: [
          anyOption(filters.maxTariff === 0, () => set('maxTariff', 0)),
          ...PRICE_STEPS.map((price) => ({
            id: String(price),
            label: format(t.priceUpTo, { price: formatMoney(price, intl) }),
            selected: filters.maxTariff === price,
            apply: () => set('maxTariff', price),
          })),
        ],
      },
    ];
  }, [filters, t, intl, locale, set]);

  const activeCount = groups.filter((group) => group.active).length;
  const open = groups.find((group) => group.key === openGroup) ?? null;

  // A station filtered out from under the selection stops counting as selected.
  // Deriving that here rather than clearing the state from an effect avoids a
  // cascading render, and brings the detail back if the filter is widened again.
  const selected = visible.find((station) => station.id === selectedId) ?? null;
  const activeId = selected?.id ?? null;

  const select = useCallback((id: string | null) => setSelectedId(id), []);

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
        setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      (err) => {
        setLocating(false);
        setGeoError(geolocationMessage(err));
      },
      GEO_OPTIONS,
    );
  }

  function resetView() {
    setSelectedId(null);
    setFitNonce((n) => n + 1);
  }

  return (
    <div className={cn('relative isolate w-full', className)}>
      <LazyHeroMap
        stations={visible}
        selectedId={activeId}
        onSelect={select}
        origin={origin}
        fitNonce={fitNonce}
        onReady={handleMapReady}
        className="ev-map absolute inset-0 h-full w-full"
      />

      {/* A single row of icons, same visual language as the zoom/locate rail: one
          compact control instead of a column that eats the height of the map. */}
      <div
        ref={controlsRef}
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col items-end gap-2 p-3 sm:p-4 lg:p-6"
      >
        <div className="pointer-events-auto relative flex flex-col items-end gap-2">
          <div
            role="group"
            aria-label={t.filterLabel}
            className="flex overflow-hidden rounded-2xl bg-surface shadow-[0_10px_34px_-14px_rgb(2_6_23/0.55)] ring-1 ring-border"
          >
            {activeCount > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFilters(NO_FILTERS);
                    setOpenGroup(null);
                  }}
                  title={t.clearAllHint}
                  className="relative grid size-11 place-items-center text-foreground transition hover:bg-surface-muted"
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="size-5"
                  >
                    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                  <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-contrast">
                    {activeCount}
                  </span>
                </button>
                <span aria-hidden className="w-px bg-border" />
              </>
            )}
            {groups.map((group, index) => (
              <FilterIconButton
                key={group.key}
                group={group}
                open={openGroup === group.key}
                divider={index > 0}
                onToggle={() =>
                  setOpenGroup((current) => (current === group.key ? null : group.key))
                }
              />
            ))}
          </div>

          {/* Flyout anchored under the icon that opened it, not under the middle
              of the rail — each column is a fixed 45px (button + divider), so the
              offset from the rail's right edge is just index math, no measuring
              needed. Narrow screens have no room for that and pin it flush right
              instead, where the panel is nearly as wide as the viewport anyway. */}
          {open && (
            <div
              id={`hero-filter-${open.key}`}
              role="listbox"
              aria-label={open.label}
              style={
                {
                  '--flyout-right': `${(groups.length - 1 - groups.findIndex((g) => g.key === open.key)) * 45}px`,
                } as CSSProperties
              }
              className={cn(
                'absolute right-0 top-[calc(100%+0.5rem)] sm:right-[var(--flyout-right)]',
                'w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-surface p-3',
                'shadow-[0_16px_44px_-18px_rgb(2_6_23/0.6)] ring-1 ring-border',
              )}
            >
              <div className="flex items-center justify-between px-1 pb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {open.label}
                </p>
                <button
                  type="button"
                  onClick={() => setOpenGroup(null)}
                  aria-label={d.common.close}
                  className="grid size-6 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
                >
                  <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
                    <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {open.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={option.selected}
                    onClick={option.apply}
                    className={cn(
                      'h-9 rounded-full px-3 text-xs font-semibold ring-1 transition',
                      option.selected
                        ? 'bg-brand text-brand-contrast ring-brand'
                        : 'bg-surface-muted text-muted ring-border hover:text-foreground',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {geoError && (
          <p
            role="alert"
            className="pointer-events-auto rounded-full bg-surface px-4 py-2 text-xs text-danger shadow-sm ring-1 ring-border"
          >
            {d.stations[geoError]}
          </p>
        )}
      </div>

      {/* The sheet and the control rail share the bottom edge: stacked on a phone
          so the rail stays clear of the sheet, side by side from `sm` up. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-end gap-3 p-3 pb-7 sm:flex-row sm:items-end sm:justify-between sm:p-4 sm:pb-7 lg:p-6 lg:pb-8">
        <Sheet
          stations={visible}
          selected={selected}
          open={listOpen}
          onToggle={() => setListOpen((value) => !value)}
          onSelect={select}
          onClearSelection={() => setSelectedId(null)}
          intl={intl}
          locale={locale}
          className="order-2 sm:order-1"
        />

        <div className="pointer-events-none order-1 flex flex-col gap-2 sm:order-2">
          <div className="pointer-events-auto hidden flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_10px_34px_-14px_rgb(2_6_23/0.55)] ring-1 ring-border sm:flex">
            <RailButton label={t.zoomIn} onClick={() => mapApi.current?.zoomIn()}>
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </RailButton>
            <span aria-hidden className="h-px bg-border" />
            <RailButton label={t.zoomOut} onClick={() => mapApi.current?.zoomOut()}>
              <path strokeLinecap="round" d="M5 12h14" />
            </RailButton>
          </div>

          <button
            type="button"
            onClick={locate}
            disabled={locating}
            aria-label={locating ? t.locating : t.locate}
            title={locating ? t.locating : t.locate}
            className={cn(
              'pointer-events-auto grid size-11 place-items-center rounded-2xl transition',
              'shadow-[0_10px_34px_-14px_rgb(2_6_23/0.55)] ring-1 disabled:opacity-60',
              origin
                ? 'bg-brand text-brand-contrast ring-brand'
                : 'bg-surface text-foreground ring-border hover:bg-surface-muted',
            )}
          >
            {locating ? (
              <span
                aria-hidden
                className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
            ) : (
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="size-5"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path strokeLinecap="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={resetView}
            aria-label={t.resetView}
            title={t.resetView}
            className="pointer-events-auto grid size-11 place-items-center rounded-2xl bg-surface text-foreground shadow-[0_10px_34px_-14px_rgb(2_6_23/0.55)] ring-1 ring-border transition hover:bg-surface"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 9V5h4M20 9V5h-4M4 15v4h4m12-4v4h-4"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const GROUP_ICON_PATHS: Record<GroupKey, ReactNode> = {
  power: <path strokeLinecap="round" strokeLinejoin="round" d="M13 3 4 14h6l-1 7 9-11h-6z" />,
  current: (
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h3l2-6 4 12 2-6h3M19 12h2" />
  ),
  connector: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 2.5v4M15 2.5v4M7 6.5h10V11a5 5 0 0 1-5 5 5 5 0 0 1-5-5V6.5ZM12 16v5.5"
    />
  ),
  status: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.2 2.4 2.4 4.6-5" />
    </>
  ),
  price: (
    <>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.6 3H19a2 2 0 0 1 2 2v7.4a2 2 0 0 1-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1 0-2.8l8-8A2 2 0 0 1 11.6 3Z"
      />
      <circle cx="16" cy="8" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
};

/** Every filter renders through this, so they stay the same size and shape as the zoom rail. */
function FilterIconButton({
  group,
  open,
  divider,
  onToggle,
}: {
  group: FilterGroup;
  open: boolean;
  divider: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      {divider && <span aria-hidden className="w-px bg-border" />}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`hero-filter-${group.key}`}
        aria-label={`${group.label} — ${group.value}`}
        title={`${group.label}: ${group.value}`}
        className={cn(
          'relative grid size-11 place-items-center transition',
          group.active
            ? 'bg-brand text-brand-contrast'
            : 'text-foreground hover:bg-surface-muted',
        )}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="size-5"
        >
          {GROUP_ICON_PATHS[group.key]}
        </svg>
        {group.active && (
          <span
            aria-hidden
            className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand-contrast"
          />
        )}
      </button>
    </>
  );
}

function RailButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-11 place-items-center text-foreground transition hover:bg-surface-muted"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="size-5"
      >
        {children}
      </svg>
    </button>
  );
}

interface SheetProps {
  stations: MapStation[];
  selected: MapStation | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onClearSelection: () => void;
  intl: string;
  locale: string;
  className?: string;
}

/**
 * One surface at the bottom edge: a compact summary bar that expands into the
 * result list, and swaps to the station detail when a pin is picked. Keeping
 * both in the same place means the map is never covered by two panels at once.
 */
function Sheet({
  stations,
  selected,
  open,
  onToggle,
  onSelect,
  onClearSelection,
  intl,
  locale,
  className,
}: SheetProps) {
  const { d } = useI18n();
  const t = d.home.map;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    setCanScrollDown(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, selected]);

  return (
    <div
      className={cn(
        'pointer-events-auto relative w-full overflow-hidden rounded-3xl bg-surface',
        'shadow-[0_20px_60px_-24px_rgb(2_6_23/0.6)] ring-1 ring-border sm:w-[400px]',
        className,
      )}
    >
      {/* Reads as a sheet rather than a card on a phone. */}
      <div className="flex justify-center pt-2 sm:hidden">
        <span aria-hidden className="h-1 w-10 rounded-full bg-border" />
      </div>

      {selected ? (
        <>
          <div ref={scrollRef} className="max-h-[72svh] overflow-y-auto sm:max-h-[75vh]">
            <div className="flex items-start gap-2 px-3 pb-1 pt-3">
              <button
                type="button"
                onClick={onClearSelection}
                aria-label={d.common.back}
                className="grid size-9 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-muted hover:text-foreground"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="size-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="truncate text-base font-bold text-foreground">{selected.name}</h3>
                <p className="truncate text-xs text-muted">
                  {selected.address || d.stations.addressMissing}
                </p>
              </div>
            </div>
            <StationDetail station={selected} intl={intl} locale={locale} />
          </div>

          {canScrollDown && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-surface via-surface/80 to-transparent pb-1.5 pt-6"
            >
              <span className="grid size-6 animate-bounce place-items-center rounded-full bg-surface text-muted ring-1 ring-border">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="size-3.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls="hero-map-list"
            title={open ? t.hideList : format(t.showList, { count: stations.length })}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-muted/50"
          >
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
                <path d="M13 2 4.5 13.2a.6.6 0 0 0 .48.96H10l-1 8.84 8.5-11.2a.6.6 0 0 0-.48-.96H12z" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">
                {format(t.count, { count: stations.length })}
              </span>
              <span className="block truncate text-xs text-muted">{t.subtitle}</span>
            </span>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={cn('size-5 shrink-0 text-muted transition-transform', open && 'rotate-180')}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {open && (
            <div className="px-3 pb-3">
              <StationRows
                id="hero-map-list"
                stations={stations}
                onSelect={onSelect}
                emptyLabel={t.noResults}
                intl={intl}
              />
              <Legend />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Legend() {
  const { d } = useI18n();

  return (
    <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-1 pt-2.5 text-[11px] text-muted">
      {(['available', 'busy', 'offline'] as const).map((tone) => (
        <li key={tone} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn('inline-block size-2 rounded-full', availabilityTone(tone))}
          />
          {d.status.availability[tone]}
        </li>
      ))}
    </ul>
  );
}

interface StationRowsProps {
  id: string;
  stations: MapStation[];
  onSelect: (id: string) => void;
  emptyLabel: string;
  intl: string;
}

function StationRows({ id, stations, onSelect, emptyLabel, intl }: StationRowsProps) {
  const { d } = useI18n();
  const shown = stations.length > LIST_LIMIT ? stations.slice(0, LIST_LIMIT) : stations;

  if (stations.length === 0) {
    return (
      <p id={id} className="rounded-2xl bg-surface-muted px-3 py-6 text-center text-sm text-muted">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul id={id} className="-mr-1 max-h-[38svh] space-y-1.5 overflow-y-auto pr-1 sm:max-h-[42vh]">
      {shown.map((station) => (
        <li key={station.id}>
          <button
            type="button"
            data-station={station.id}
            onClick={() => onSelect(station.id)}
            className="w-full rounded-2xl bg-surface-muted/60 px-3 py-2.5 text-left ring-1 ring-transparent transition hover:bg-surface-muted hover:ring-border"
          >
            <div className="flex items-start gap-2">
              <span
                aria-hidden
                className={cn(
                  'mt-1.5 inline-block size-2 shrink-0 rounded-full',
                  availabilityTone(station.availability),
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{station.name}</p>
                <p className="truncate text-xs text-muted">
                  {station.address || d.stations.addressMissing}
                </p>
              </div>
              {station.distanceKm !== undefined && (
                <span className="shrink-0 text-[11px] font-medium text-muted">
                  {formatDistance(station.distanceKm, intl)}
                </span>
              )}
            </div>
            <p className="mt-1 pl-4 text-[11px] text-muted">
              {format(d.stations.free, {
                available: station.availableConnectors,
                total: station.totalConnectors,
              })}
              {station.maxPowerKw ? ` · ${formatPowerKw(station.maxPowerKw, intl)}` : ''}
            </p>
          </button>
        </li>
      ))}

      {shown.length < stations.length && (
        <li className="px-3 pb-1 pt-2 text-center text-[11px] text-muted">
          {format(d.home.map.listCapped, { shown: shown.length, total: stations.length })}{' '}
          <Link href="/stations" className="font-semibold text-brand hover:underline">
            {d.home.map.seeAllList} →
          </Link>
        </li>
      )}
    </ul>
  );
}

function StationDetail({
  station,
  intl,
  locale,
}: {
  station: MapStation;
  intl: string;
  locale: string;
}) {
  const { d } = useI18n();
  const t = d.home.map;

  return (
    <div className="px-4 pb-4">
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <span
            aria-hidden
            className={cn(
              'inline-block size-2.5 rounded-full',
              availabilityTone(station.availability),
            )}
          />
          {availabilityLabel(station.availability, locale)}
        </span>
        <span className="text-muted">
          ·{' '}
          {format(d.stations.free, {
            available: station.availableConnectors,
            total: station.totalConnectors,
          })}
        </span>
        {station.distanceKm !== undefined && (
          <span className="text-muted">· {formatDistance(station.distanceKm, intl)}</span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
        <div className="min-w-0">
          <dt className="truncate text-xs text-muted">{d.stations.maxPower}</dt>
          <dd className="truncate whitespace-nowrap font-semibold text-foreground">
            {station.maxPowerKw ? formatPowerKw(station.maxPowerKw, intl) : '—'}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="truncate text-xs text-muted">{d.stations.price}</dt>
          <dd className="truncate whitespace-nowrap font-semibold text-foreground">
            {formatTariff(station.tariffPerKwh, intl)}
          </dd>
        </div>
      </dl>

      {station.connectorTypes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {station.connectorTypes.map((type) => (
            <span
              key={type}
              className="rounded-lg bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-border"
            >
              {type}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          href={`/stations/${encodeURIComponent(station.id)}`}
          className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-brand px-4 text-sm font-semibold text-brand-contrast transition hover:bg-brand-strong"
        >
          {d.stations.viewStation}
        </Link>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-surface-muted px-4 text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-surface"
        >
          {t.directions}
        </a>
      </div>
    </div>
  );
}
