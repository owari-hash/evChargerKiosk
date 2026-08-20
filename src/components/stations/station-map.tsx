'use client';

import 'leaflet/dist/leaflet.css';
import { divIcon, latLngBounds, type DivIcon } from 'leaflet';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useI18n } from '@/components/i18n-provider';
import { publicEnv } from '@/lib/env';
import type { Station, StationAvailability } from '@/lib/types';
import { availabilityLabel, availabilityTone, cn, formatMoney } from '@/lib/utils';

export interface StationMapProps {
  stations: Station[];
  /** Station the list has focused; its marker grows and the map flies to it. */
  selectedId?: string | null;
  onSelect?: (stationId: string) => void;
  /** Off for a single-station map, which keeps the fixed zoom it was given. */
  fitToStations?: boolean;
  zoom?: number;
  scrollWheelZoom?: boolean;
  ariaLabel?: string;
  className?: string;
}

type Located = Station & { latitude: number; longitude: number };

function isLocated(station: Station): station is Located {
  return typeof station.latitude === 'number' && typeof station.longitude === 'number';
}

/**
 * `currentColor` drives the pulse ring in globals.css, and Tailwind only emits
 * classes it can see literally — so the text colours are spelled out here rather
 * than derived from `availabilityTone()`, which supplies the fill.
 */
const PULSE_TEXT: Record<StationAvailability, string> = {
  available: 'text-emerald-500',
  busy: 'text-amber-500',
  offline: 'text-slate-400',
  unknown: 'text-slate-300',
};

const iconCache = new Map<string, DivIcon>();

/**
 * Leaflet's default marker images resolve to URLs that bundlers rewrite, so the
 * pins are plain DOM built with divIcon instead.
 */
function markerIcon(availability: StationAvailability, active: boolean): DivIcon {
  const key = `${availability}:${active}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const fill = availabilityTone(availability);
  const dot = active ? 'size-4' : 'size-3';
  const pulse =
    availability === 'available'
      ? `<span class="station-pin-pulse absolute inset-0 rounded-full ${PULSE_TEXT[availability]}"></span>`
      : '';

  const icon = divIcon({
    className: 'station-pin',
    html: `<span class="relative grid size-5 place-items-center">${pulse}<span class="relative block ${dot} rounded-full ${fill} ring-2 ring-white/90 dark:ring-black/60"></span></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });

  iconCache.set(key, icon);
  return icon;
}

/** Keeps every visible station in frame whenever the result set changes. */
function FitBounds({ points, enabled }: { points: Located[]; enabled: boolean }) {
  const map = useMap();
  const signature = points.map((s) => `${s.latitude},${s.longitude}`).join('|');

  useEffect(() => {
    if (!enabled || !signature) return;
    const coords = signature
      .split('|')
      .map((pair) => pair.split(',').map(Number) as [number, number]);

    if (coords.length === 1) {
      map.setView(coords[0]!, Math.max(map.getZoom(), 14));
      return;
    }
    map.fitBounds(latLngBounds(coords), { padding: [48, 48], maxZoom: 15 });
  }, [signature, enabled, map]);

  return null;
}

function PanToSelection({ station }: { station: Located | undefined }) {
  const map = useMap();
  const lat = station?.latitude;
  const lng = station?.longitude;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [lat, lng, map]);

  return null;
}

export function StationMap({
  stations,
  selectedId = null,
  onSelect,
  fitToStations = true,
  zoom,
  scrollWheelZoom = true,
  ariaLabel = 'Map of charging stations',
  className,
}: StationMapProps) {
  const { locale } = useI18n();
  const points = useMemo(() => stations.filter(isLocated), [stations]);
  const selected = points.find((s) => s.id === selectedId);
  const first = points[0];
  const center: [number, number] = first
    ? [first.latitude, first.longitude]
    : [publicEnv.defaultCenter.lat, publicEnv.defaultCenter.lng];

  return (
    <div role="region" aria-label={ariaLabel} className={cn('h-full w-full', className)}>
      <MapContainer
        center={center}
        zoom={zoom ?? publicEnv.defaultZoom}
        scrollWheelZoom={scrollWheelZoom}
        className="h-full w-full overflow-hidden rounded-2xl ring-1 ring-border shadow-[var(--shadow-card)]"
      >
        <TileLayer url={publicEnv.mapTileUrl} attribution={publicEnv.mapAttribution} />
        <FitBounds points={points} enabled={fitToStations} />
        <PanToSelection station={selected} />

        {points.map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            icon={markerIcon(station.availability, station.id === selectedId)}
            title={station.name}
            alt={`${station.name} — ${availabilityLabel(station.availability, locale)}`}
            eventHandlers={onSelect ? { click: () => onSelect(station.id) } : undefined}
          >
            <Popup>
              <div className="min-w-48 space-y-1.5">
                <p className="text-sm font-semibold text-foreground">{station.name}</p>
                {station.address && <p className="text-xs text-muted">{station.address}</p>}
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <span
                    aria-hidden
                    className={cn(
                      'inline-block size-2 rounded-full',
                      availabilityTone(station.availability),
                    )}
                  />
                  {availabilityLabel(station.availability, locale)} · {station.availableConnectors}/
                  {station.totalConnectors} free
                </p>
                <p className="text-xs text-muted">
                  {station.maxPowerKw ? `${station.maxPowerKw} kW` : 'Power not published'} ·{' '}
                  {station.tariffPerKwh === undefined
                    ? 'Tariff not published'
                    : `${formatMoney(station.tariffPerKwh)}/kWh`}
                </p>
                <Link
                  href={`/stations/${encodeURIComponent(station.id)}`}
                  className="inline-block pt-1 text-xs font-semibold text-brand hover:underline"
                >
                  View station
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
