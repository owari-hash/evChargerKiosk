'use client';

import 'leaflet/dist/leaflet.css';
import {
  divIcon,
  latLngBounds,
  layerGroup,
  marker as createMarker,
  type DivIcon,
  type LatLngExpression,
  type LayerGroup,
  type Marker,
} from 'leaflet';
import { useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { format, useI18n } from '@/components/i18n-provider';
import { publicEnv } from '@/lib/env';
import type { StationAvailability } from '@/lib/types';
import type { MapStation } from './map-station';

/** Map actions the surrounding chrome drives, so the controls can live in the
 *  page's own button rail rather than in Leaflet's. */
export interface HeroMapApi {
  zoomIn: () => void;
  zoomOut: () => void;
}

export interface HeroMapProps {
  stations: MapStation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Where the visitor is, once they have shared it. */
  origin: { lat: number; lng: number } | null;
  /** Bumping this refits the view to every visible station. */
  fitNonce: number;
  /** Hands the zoom controls to the caller once the map exists. */
  onReady?: (api: HeroMapApi) => void;
  className?: string;
}

/**
 * Clustering grid, in screen pixels. Stations that project into the same cell at
 * the current zoom collapse into one bubble, which caps how many DOM markers can
 * exist regardless of how large the network grows.
 */
const CELL_PX = 62;

/** How far outside the viewport markers are still built, as a fraction of the view. */
const VIEWPORT_PAD = 0.3;

const MAX_FIT_ZOOM = 15;

/**
 * Room the page's own controls take at the top (search plus filter chips) and at
 * the bottom (the station sheet), so panning can keep a pin clear of them.
 */
const CHROME_TOP_PX = 118;
const CHROME_BOTTOM_PX = 300;

const PIN_COLOR: Record<StationAvailability, string> = {
  available: '#10b981',
  busy: '#f59e0b',
  offline: '#94a3b8',
  unknown: '#64748b',
};

const BOLT_PATH = 'M13 2 4.5 13.2a.6.6 0 0 0 .48.96H10l-1 8.84 8.5-11.2a.6.6 0 0 0-.48-.96H12z';

/** One entry per marker that should currently be on the map. */
interface Entry {
  lat: number;
  lng: number;
  /** Set for a lone station; `members` is set instead for a cluster. */
  station?: MapStation;
  members?: MapStation[];
  count: number;
  tone: StationAvailability;
}

/** A cluster takes the colour of the best news it contains. */
function clusterTone(items: MapStation[]): StationAvailability {
  let busy = false;
  let offline = false;
  for (const item of items) {
    if (item.availability === 'available') return 'available';
    if (item.availability === 'busy') busy = true;
    if (item.availability === 'offline') offline = true;
  }
  if (busy) return 'busy';
  return offline ? 'offline' : 'unknown';
}

function clusterSize(count: number): number {
  if (count < 10) return 38;
  if (count < 25) return 44;
  if (count < 100) return 52;
  return 60;
}

/**
 * Icons are plain DOM built with `divIcon` — Leaflet's default marker images
 * resolve to URLs the bundler rewrites, and this also lets a pin be one cached
 * node rather than an image request. Tailwind only emits classes it can see
 * literally, so the palette is handed over in the `--pin` custom property and
 * the rest of the styling lives in globals.css.
 */
const iconCache = new Map<string, DivIcon>();

function pinIcon(tone: StationAvailability): DivIcon {
  const key = `p:${tone}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const pulse = tone === 'available' ? '<span class="ev-pin__pulse"></span>' : '';
  const icon = divIcon({
    className: 'ev-pin',
    html:
      `<span class="ev-pin__inner" style="--pin:${PIN_COLOR[tone]}">${pulse}` +
      '<span class="ev-pin__dot"><svg viewBox="0 0 24 24" class="ev-pin__bolt" aria-hidden="true">' +
      `<path d="${BOLT_PATH}" /></svg></span></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  iconCache.set(key, icon);
  return icon;
}

function clusterIcon(count: number, tone: StationAvailability): DivIcon {
  const key = `c:${count}:${tone}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const size = clusterSize(count);
  const icon = divIcon({
    className: 'ev-cluster',
    html:
      `<span class="ev-cluster__inner" style="--pin:${PIN_COLOR[tone]};--size:${size}px">` +
      `<span class="ev-cluster__count">${count}</span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  iconCache.set(key, icon);
  return icon;
}

const userIcon = divIcon({
  className: 'ev-me',
  html: '<span class="ev-me__pulse"></span><span class="ev-me__dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/**
 * Builds the marker layer by hand rather than rendering a React element per
 * station. Panning and zooming then cost one pass over the stations plus a key
 * diff — React never re-reconciles the marker tree, which is what keeps the
 * frame rate steady however large the network grows.
 */
function StationLayer({
  stations,
  selectedId,
  onSelect,
}: {
  stations: MapStation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const map = useMap();
  const { d } = useI18n();

  const groupRef = useRef<LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const stationsRef = useRef(stations);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const clusterLabelRef = useRef(d.home.map.clusterAria);

  useEffect(() => {
    onSelectRef.current = onSelect;
    clusterLabelRef.current = d.home.map.clusterAria;
  }, [onSelect, d]);

  /** Grows the marker whose station the panel has focused. */
  const applySelection = useCallback(() => {
    const wanted = selectedRef.current;
    for (const [key, m] of markersRef.current) {
      const el = m.getElement();
      if (!el) continue;
      el.classList.toggle('is-selected', wanted !== null && key.startsWith(`s:${wanted}:`));
    }
  }, []);

  const render = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;

    const zoom = map.getZoom();
    const bounds = map.getBounds().pad(VIEWPORT_PAD);
    const wantedId = selectedRef.current;

    // Project into pixel space at the current zoom and bucket by grid cell. Only
    // what is near the viewport is considered, so an off-screen station costs a
    // bounds test and nothing more.
    const cells = new Map<string, { sx: number; sy: number; items: MapStation[] }>();
    for (const station of stationsRef.current) {
      // The focused station always gets a pin of its own — swallowed into a
      // bubble it would leave the sheet describing a station you cannot see.
      if (station.id === wantedId) continue;
      if (!bounds.contains([station.lat, station.lng])) continue;
      const point = map.project([station.lat, station.lng], zoom);
      const key = `${Math.round(point.x / CELL_PX)}:${Math.round(point.y / CELL_PX)}`;
      const cell = cells.get(key);
      if (cell) {
        cell.sx += point.x;
        cell.sy += point.y;
        cell.items.push(station);
      } else {
        cells.set(key, { sx: point.x, sy: point.y, items: [station] });
      }
    }

    const next = new Map<string, Entry>();
    for (const [key, cell] of cells) {
      if (cell.items.length === 1) {
        const station = cell.items[0]!;
        // Availability is part of the key, so a status change swaps the icon.
        next.set(`s:${station.id}:${station.availability}`, {
          lat: station.lat,
          lng: station.lng,
          station,
          count: 1,
          tone: station.availability,
        });
        continue;
      }
      const tone = clusterTone(cell.items);
      const centre = map.unproject(
        [cell.sx / cell.items.length, cell.sy / cell.items.length],
        zoom,
      );
      next.set(`c:${key}:${cell.items.length}:${tone}`, {
        lat: centre.lat,
        lng: centre.lng,
        members: cell.items,
        count: cell.items.length,
        tone,
      });
    }

    if (wantedId) {
      const focused = stationsRef.current.find((station) => station.id === wantedId);
      if (focused && bounds.contains([focused.lat, focused.lng])) {
        next.set(`s:${focused.id}:${focused.availability}:sel`, {
          lat: focused.lat,
          lng: focused.lng,
          station: focused,
          count: 1,
          tone: focused.availability,
        });
      }
    }

    const current = markersRef.current;

    for (const [key, m] of current) {
      if (next.has(key)) continue;
      group.removeLayer(m);
      current.delete(key);
    }

    for (const [key, entry] of next) {
      if (current.has(key)) continue;

      const label = entry.station?.name ?? format(clusterLabelRef.current, { count: entry.count });
      const m = createMarker([entry.lat, entry.lng], {
        icon: entry.station ? pinIcon(entry.tone) : clusterIcon(entry.count, entry.tone),
        title: label,
        riseOnHover: true,
        // Bubbles sit above individual pins so one is never half-hidden, and the
        // focused pin sits above both.
        zIndexOffset: key.endsWith(':sel') ? 900 : entry.station ? 0 : 400,
      });

      m.on('click', () => {
        if (entry.station) {
          onSelectRef.current(entry.station.id);
          return;
        }
        const members = entry.members ?? [];
        const area = latLngBounds(members.map((s) => [s.lat, s.lng] as [number, number]));
        if (area.getNorthEast().equals(area.getSouthWest())) {
          // Every station in the bubble shares one address, so its bounds are a
          // single point — step the zoom instead of fitting to nothing.
          map.flyTo(area.getCenter(), Math.min(map.getZoom() + 2, map.getMaxZoom()), {
            duration: 0.5,
          });
        } else {
          map.flyToBounds(area, { padding: [70, 70], maxZoom: 17, duration: 0.5 });
        }
      });

      group.addLayer(m);
      current.set(key, m);

      const el = m.getElement();
      if (el) {
        el.setAttribute('role', 'button');
        el.setAttribute('aria-label', label);
      }
    }

    applySelection();
  }, [map, applySelection]);

  useEffect(() => {
    const group = layerGroup().addTo(map);
    const markers = markersRef.current;
    groupRef.current = group;

    // Markers are rebuilt once a gesture settles, never per frame: during a pan
    // or a zoom animation Leaflet simply transforms the nodes already in place.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        render();
      });
    };

    map.on('moveend', schedule);
    map.on('zoomend', schedule);
    map.on('resize', schedule);
    schedule();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      map.off('moveend', schedule);
      map.off('zoomend', schedule);
      map.off('resize', schedule);
      group.remove();
      groupRef.current = null;
      markers.clear();
    };
  }, [map, render]);

  useEffect(() => {
    stationsRef.current = stations;
    render();
  }, [stations, render]);

  useEffect(() => {
    selectedRef.current = selectedId;
    render();
  }, [selectedId, render]);

  return null;
}

/** Keeps the focused station on screen without yanking the view around. */
function FollowSelection({ station }: { station: MapStation | undefined }) {
  const map = useMap();
  const lat = station?.lat;
  const lng = station?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const target: LatLngExpression = [lat, lng];
    // Already comfortably in view: a short pan reads better than a zoom. The
    // padding clears the search bar above and the station sheet below, so the
    // pin never lands underneath the chrome describing it.
    if (map.getBounds().pad(-0.15).contains(target)) {
      map.panInside(target, {
        paddingTopLeft: [28, CHROME_TOP_PX],
        paddingBottomRight: [28, CHROME_BOTTOM_PX],
      });
      return;
    }
    map.flyTo(target, Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [lat, lng, map]);

  return null;
}

/** Frames the whole result set — on load, on a filter change, and on demand. */
function FitToStations({
  stations,
  fitNonce,
  paused,
}: {
  stations: MapStation[];
  fitNonce: number;
  paused: boolean;
}) {
  const map = useMap();
  const signature = stations.map((s) => s.id).join('|');
  const pausedRef = useRef(paused);
  const stationsRef = useRef(stations);

  useEffect(() => {
    pausedRef.current = paused;
    stationsRef.current = stations;
  });

  useEffect(() => {
    if (!signature) return;
    // A station the visitor just picked owns the view; refitting would fight it.
    if (pausedRef.current) return;

    const coords = stationsRef.current.map((s) => [s.lat, s.lng] as [number, number]);
    if (coords.length === 1) {
      map.setView(coords[0]!, Math.max(map.getZoom(), 14), { animate: true });
      return;
    }
    map.flyToBounds(latLngBounds(coords), {
      padding: [70, 70],
      maxZoom: MAX_FIT_ZOOM,
      duration: 0.6,
    });
  }, [signature, fitNonce, map]);

  return null;
}

function UserMarker({ origin }: { origin: { lat: number; lng: number } | null }) {
  const map = useMap();
  const lat = origin?.lat;
  const lng = origin?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const m = createMarker([lat, lng], {
      icon: userIcon,
      interactive: false,
      keyboard: false,
      zIndexOffset: 800,
    }).addTo(map);
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.7 });
    return () => {
      m.remove();
    };
  }, [lat, lng, map]);

  return null;
}

/**
 * A full-bleed map must not swallow the page scroll, so the wheel only zooms
 * once the visitor has clicked into the map. Touch dragging, keyboard panning
 * and the zoom buttons are unaffected.
 */
function WheelGuard() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();

    container.addEventListener('click', enable);
    container.addEventListener('focusin', enable);
    container.addEventListener('mouseleave', disable);
    container.addEventListener('focusout', disable);

    return () => {
      container.removeEventListener('click', enable);
      container.removeEventListener('focusin', enable);
      container.removeEventListener('mouseleave', disable);
      container.removeEventListener('focusout', disable);
    };
  }, [map]);

  return null;
}

function MapApi({ onReady }: { onReady?: (api: HeroMapApi) => void }) {
  const map = useMap();

  useEffect(() => {
    onReady?.({ zoomIn: () => map.zoomIn(), zoomOut: () => map.zoomOut() });
  }, [map, onReady]);

  return null;
}

/** Leaflet only remeasures on a window resize; the hero also changes size on its own. */
function ResizeWatcher() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        map.invalidateSize({ animate: false });
      });
    });
    observer.observe(container);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

export function HeroMap({
  stations,
  selectedId,
  onSelect,
  origin,
  fitNonce,
  onReady,
  className,
}: HeroMapProps) {
  const { d } = useI18n();
  const selected = stations.find((s) => s.id === selectedId);
  const center: [number, number] = [publicEnv.defaultCenter.lat, publicEnv.defaultCenter.lng];

  return (
    <MapContainer
      center={center}
      zoom={publicEnv.defaultZoom}
      minZoom={4}
      maxZoom={19}
      zoomControl={false}
      scrollWheelZoom={false}
      // Smooths out trackpads, which otherwise fire a zoom per wheel tick.
      wheelDebounceTime={45}
      wheelPxPerZoomLevel={140}
      className={className}
      aria-label={d.stations.mapAria}
    >
      <TileLayer
        url={publicEnv.mapTileUrl}
        attribution={publicEnv.mapAttribution}
        maxZoom={19}
        // Tiles are only swapped once a gesture settles, and a ring of tiles is
        // kept around the viewport so panning reveals cached tiles, not gaps.
        //
        // `detectRetina` is deliberately off: it fetches a zoom level deeper and
        // renders at half size, which is four times the tile requests, decodes
        // and composited layers for a sharpness gain that is barely visible
        // below 2x. Panning felt slow long before the frame budget was the
        // problem, because the map was waiting on four times the network.
        updateWhenZooming={false}
        keepBuffer={2}
      />
      <MapApi onReady={onReady} />
      <WheelGuard />
      <ResizeWatcher />
      <FitToStations stations={stations} fitNonce={fitNonce} paused={selectedId !== null} />
      <StationLayer stations={stations} selectedId={selectedId} onSelect={onSelect} />
      <FollowSelection station={selected} />
      <UserMarker origin={origin} />
    </MapContainer>
  );
}
