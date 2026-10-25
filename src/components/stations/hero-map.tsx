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
import { useI18n } from '@/components/i18n-provider';
import { publicEnv } from '@/lib/env';
import type { StationAvailability } from '@/lib/types';
import type { MapStation } from './map-station';

/** Map actions the surrounding chrome drives, so the controls can live in the
 *  page's own button rail rather than in Leaflet's. */
export interface HeroMapApi {
  zoomIn: () => void;
  zoomOut: () => void;
}

/** The visible area, reported whenever the view settles. */
export interface ViewBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface HeroMapProps {
  stations: MapStation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Called with the visible area after every pan or zoom. */
  onViewChange?: (view: ViewBounds) => void;
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
  station: MapStation;
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

  const groupRef = useRef<LayerGroup | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const stationsRef = useRef(stations);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

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

    // Filter stations visible inside or near the viewport
    const visible = stationsRef.current.filter((s) => bounds.contains([s.lat, s.lng]));

    // Project each visible station to screen pixel space at current zoom
    const projected = visible.map((station) => ({
      station,
      pt: map.project([station.lat, station.lng], zoom),
    }));

    // Detect co-located / extremely close stations (within 24px) so that stations
    // at the same charging hub or building are gracefully spread side-by-side
    // and both remain fully visible, distinct, and clickable.
    const groups: Array<Array<{ station: MapStation; pt: { x: number; y: number } }>> = [];
    const visited = new Set<string>();

    for (let i = 0; i < projected.length; i++) {
      const item = projected[i]!;
      if (visited.has(item.station.id)) continue;

      const g = [item];
      visited.add(item.station.id);

      for (let j = i + 1; j < projected.length; j++) {
        const other = projected[j]!;
        if (visited.has(other.station.id)) continue;
        const dist = Math.hypot(item.pt.x - other.pt.x, item.pt.y - other.pt.y);
        if (dist < 24) {
          g.push(other);
          visited.add(other.station.id);
        }
      }
      groups.push(g);
    }

    const next = new Map<string, Entry>();

    for (const g of groups) {
      if (g.length === 1) {
        const { station } = g[0]!;
        next.set(`s:${station.id}:${station.availability}`, {
          lat: station.lat,
          lng: station.lng,
          station,
          count: 1,
          tone: station.availability,
        });
      } else {
        // Disperse co-located stations slightly so each station shows its own pin
        const count = g.length;
        const cx = g.reduce((sum, item) => sum + item.pt.x, 0) / count;
        const cy = g.reduce((sum, item) => sum + item.pt.y, 0) / count;
        const radius = count === 2 ? 16 : 20;

        g.forEach((item, idx) => {
          let ox = cx;
          let oy = cy;
          if (count === 2) {
            ox = idx === 0 ? cx - radius : cx + radius;
          } else {
            const angle = (2 * Math.PI * idx) / count - Math.PI / 2;
            ox = cx + radius * Math.cos(angle);
            oy = cy + radius * Math.sin(angle);
          }
          const pos = map.unproject([ox, oy], zoom);
          next.set(`s:${item.station.id}:${item.station.availability}`, {
            lat: pos.lat,
            lng: pos.lng,
            station: item.station,
            count: 1,
            tone: item.station.availability,
          });
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

      const label = entry.station.name;
      const isSelected = entry.station.id === wantedId;
      const m = createMarker([entry.lat, entry.lng], {
        icon: pinIcon(entry.tone),
        title: label,
        riseOnHover: true,
        zIndexOffset: isSelected ? 900 : 100,
      });

      m.on('click', () => {
        onSelectRef.current(entry.station.id);
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

/** Street level: close enough to see which side of the road the charger is on. */
const SELECTED_ZOOM = 16;

/** Brings the focused station in close, without yanking a view that is already there. */
function FollowSelection({ station }: { station: MapStation | undefined }) {
  const map = useMap();
  const lat = station?.lat;
  const lng = station?.lng;

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const target: LatLngExpression = [lat, lng];
    // Already at street level and comfortably in view: a short pan reads better
    // than another zoom. The padding clears the search bar above and the station
    // sheet below, so the pin never lands underneath the chrome describing it.
    if (map.getZoom() >= SELECTED_ZOOM && map.getBounds().pad(-0.15).contains(target)) {
      map.panInside(target, {
        paddingTopLeft: [28, CHROME_TOP_PX],
        paddingBottomRight: [28, CHROME_BOTTOM_PX],
      });
      return;
    }
    map.flyTo(target, Math.max(map.getZoom(), SELECTED_ZOOM), { duration: 0.6 });
  }, [lat, lng, map]);

  return null;
}

/** A click on empty map closes the station that was open. */
function DeselectOnMapClick({ onSelect }: { onSelect: (id: string | null) => void }) {
  const map = useMap();
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    // Marker clicks do not bubble to the map, so this only sees the map itself.
    const handler = () => onSelectRef.current(null);
    map.on('click', handler);
    return () => {
      map.off('click', handler);
    };
  }, [map]);

  return null;
}

/** Tells the page which part of the map is on screen, once each gesture settles. */
function ViewportReporter({ onViewChange }: { onViewChange?: (view: ViewBounds) => void }) {
  const map = useMap();
  const callbackRef = useRef(onViewChange);

  useEffect(() => {
    callbackRef.current = onViewChange;
  });

  useEffect(() => {
    const report = () => {
      const bounds = map.getBounds();
      callbackRef.current?.({
        south: bounds.getSouth(),
        west: bounds.getWest(),
        north: bounds.getNorth(),
        east: bounds.getEast(),
      });
    };
    map.on('moveend', report);
    report();
    return () => {
      map.off('moveend', report);
    };
  }, [map]);

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

/** How long the wheel must stay still before the next scroll can zoom again. */
const WHEEL_GESTURE_GAP_MS = 220;

/**
 * One scroll is one zoom level, centred on the pointer — the wheel zooms the
 * map straight away, and the page below is reached with the hero's scroll-down
 * button. Leaflet's own wheel zoom turns the stream of events a trackpad or a
 * smooth-scrolling mouse sends for a single flick into several levels; this
 * takes the first event of a gesture and ignores the rest until it goes quiet.
 */
function SteppedWheelZoom() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let locked = false;
    let quiet: ReturnType<typeof setTimeout> | undefined;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (Math.abs(event.deltaY) < 1) return;

      clearTimeout(quiet);
      quiet = setTimeout(() => {
        locked = false;
      }, WHEEL_GESTURE_GAP_MS);
      if (locked) return;
      locked = true;

      const around = map.containerPointToLatLng(map.mouseEventToContainerPoint(event));
      const next = map.getZoom() + (event.deltaY < 0 ? 1 : -1);
      map.setZoomAround(around, Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), next)));
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
      clearTimeout(quiet);
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
  onViewChange,
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
      // Wheel zoom is handled by SteppedWheelZoom below: one scroll, one level.
      scrollWheelZoom={false}
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
      <SteppedWheelZoom />
      <ResizeWatcher />
      <FitToStations stations={stations} fitNonce={fitNonce} paused={selectedId !== null} />
      <StationLayer stations={stations} selectedId={selectedId} onSelect={onSelect} />
      <DeselectOnMapClick onSelect={onSelect} />
      <ViewportReporter onViewChange={onViewChange} />
      {/* The user's marker flies to them first; when locating also picked the
          nearest station, that selection's fly runs after and wins. */}
      <UserMarker origin={origin} />
      <FollowSelection station={selected} />
    </MapContainer>
  );
}
