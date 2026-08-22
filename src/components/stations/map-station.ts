import type { ConnectorType, Station, StationAvailability } from '@/lib/types';

/**
 * Charging speed class, derived once on the server so the map can filter without
 * shipping the connector arrays to the browser.
 */
export type StationSpeed = 'dc' | 'ac' | 'unknown';

/**
 * The slice of a station the hero map needs. Full `Station` objects carry a
 * connector array each, which turns into a sizeable RSC payload once the whole
 * network is on the map — this keeps the hero's initial HTML small.
 */
export interface MapStation {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  availability: StationAvailability;
  availableConnectors: number;
  totalConnectors: number;
  maxPowerKw?: number;
  tariffPerKwh?: number;
  connectorTypes: ConnectorType[];
  speed: StationSpeed;
  distanceKm?: number;
}

const DC_TYPES: ReadonlySet<ConnectorType> = new Set(['CCS2', 'CHAdeMO', 'GBT']);
const AC_TYPES: ReadonlySet<ConnectorType> = new Set(['Type2', 'Type1', 'Schuko']);

/** Anything at or above this rating is a DC charger in practice. */
const DC_POWER_KW = 43;

function speedOf(station: Station): StationSpeed {
  if (station.connectorTypes.some((t) => DC_TYPES.has(t))) return 'dc';
  if (station.connectorTypes.some((t) => AC_TYPES.has(t))) {
    // A Type2 socket rated above 43 kW is a DC unit that was tagged loosely.
    return (station.maxPowerKw ?? 0) >= DC_POWER_KW ? 'dc' : 'ac';
  }
  // Plug types are optional metadata, so fall back to the power rating alone.
  if (station.maxPowerKw === undefined) return 'unknown';
  return station.maxPowerKw >= DC_POWER_KW ? 'dc' : 'ac';
}

/** Returns null for stations the operator has not given coordinates yet. */
export function toMapStation(station: Station): MapStation | null {
  if (typeof station.latitude !== 'number' || typeof station.longitude !== 'number') return null;
  if (!Number.isFinite(station.latitude) || !Number.isFinite(station.longitude)) return null;

  return {
    id: station.id,
    name: station.name,
    address: station.address,
    lat: station.latitude,
    lng: station.longitude,
    availability: station.availability,
    availableConnectors: station.availableConnectors,
    totalConnectors: station.totalConnectors,
    maxPowerKw: station.maxPowerKw,
    tariffPerKwh: station.tariffPerKwh,
    connectorTypes: station.connectorTypes,
    speed: speedOf(station),
    distanceKm: station.distanceKm,
  };
}

export function toMapStations(stations: Station[]): MapStation[] {
  const mapped: MapStation[] = [];
  for (const station of stations) {
    const point = toMapStation(station);
    if (point) mapped.push(point);
  }
  return mapped;
}
