import { serverEnv } from '@/lib/env';
import type { ChargingSession, Paginated, Station } from '@/lib/types';
import { haversineKm } from '@/lib/utils';
import { CsmsUnavailableError, csmsFetch } from './client';
import { DEMO_CHARGE_POINTS } from './demo-data';
import { toStation, type CsmsChargePoint } from './mapping';

export interface StationQuery {
  search?: string;
  status?: 'all' | 'available' | 'busy' | 'offline';
  connectorType?: string;
  minPowerKw?: number;
  /** When supplied, results are annotated with `distanceKm` and sorted by it. */
  lat?: number;
  lng?: number;
  limit?: number;
}

export interface StationResult {
  stations: Station[];
  /** True when the CSMS was unreachable and the built-in sample network was served. */
  demo: boolean;
  warning?: string;
}

async function loadChargePoints(): Promise<{ raw: CsmsChargePoint[]; demo: boolean; warning?: string }> {
  try {
    const res = await csmsFetch<Paginated<CsmsChargePoint>>('/charge-points?limit=500');
    return { raw: res.data ?? [], demo: false };
  } catch (err) {
    const message = (err as Error).message;
    const unreachable = err instanceof CsmsUnavailableError;
    if (serverEnv.demoData()) {
      console.warn(`[stations] serving demo data — ${message}`);
      return {
        raw: DEMO_CHARGE_POINTS,
        demo: true,
        warning: unreachable
          ? 'Live data is unavailable right now — showing a sample network.'
          : `Live data is unavailable (${message}) — showing a sample network.`,
      };
    }
    throw err;
  }
}

function matches(station: Station, query: StationQuery): boolean {
  if (query.status && query.status !== 'all' && station.availability !== query.status) return false;

  if (query.connectorType) {
    const wanted = query.connectorType.toLowerCase();
    if (!station.connectorTypes.some((t) => t.toLowerCase() === wanted)) return false;
  }

  if (query.minPowerKw && (station.maxPowerKw ?? 0) < query.minPowerKw) return false;

  if (query.search) {
    const needle = query.search.toLowerCase();
    const haystack = [station.id, station.name, station.address, station.description, ...station.tags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

export async function listStations(query: StationQuery = {}): Promise<StationResult> {
  const { raw, demo, warning } = await loadChargePoints();
  const origin =
    query.lat !== undefined && query.lng !== undefined
      ? { lat: query.lat, lng: query.lng }
      : undefined;

  const stations = raw
    .map(toStation)
    .map((station) => {
      if (!origin || station.latitude === undefined || station.longitude === undefined) {
        return station;
      }
      return {
        ...station,
        distanceKm: haversineKm(origin, { lat: station.latitude, lng: station.longitude }),
      };
    })
    .filter((station) => matches(station, query))
    .sort((a, b) => {
      if (origin) {
        // Stations without coordinates sink to the bottom of a nearby search.
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      const rank = { available: 0, busy: 1, unknown: 2, offline: 3 } as const;
      if (rank[a.availability] !== rank[b.availability]) {
        return rank[a.availability] - rank[b.availability];
      }
      return a.name.localeCompare(b.name);
    })
    .slice(0, query.limit ?? 200);

  return { stations, demo, warning };
}

export async function getStation(id: string): Promise<{ station: Station | null; demo: boolean }> {
  try {
    const cp = await csmsFetch<CsmsChargePoint>(`/charge-points/${encodeURIComponent(id)}`);
    return { station: toStation(cp), demo: false };
  } catch (err) {
    if (serverEnv.demoData()) {
      const cp = DEMO_CHARGE_POINTS.find((c) => c.id === id);
      if (cp) return { station: toStation(cp), demo: true };
      // A 404 from the CSMS is a real answer; anything else falls through to demo.
      const status = (err as { status?: number }).status;
      if (status === 404) return { station: null, demo: false };
      return { station: null, demo: true };
    }
    const status = (err as { status?: number }).status;
    if (status === 404) return { station: null, demo: false };
    throw err;
  }
}

interface CsmsTransaction {
  transactionId?: number;
  _id?: number;
  chargePointId: string;
  connectorId: number;
  idTag: string;
  status: 'Active' | 'Completed' | 'Rejected';
  startTimestamp: string;
  stopTimestamp?: string;
  energyWh?: number;
  cost?: number;
  lastPowerW?: number;
  lastSocPercent?: number;
  stopReason?: string;
}

function toSession(tx: CsmsTransaction): ChargingSession {
  return {
    transactionId: tx.transactionId ?? tx._id ?? 0,
    chargePointId: tx.chargePointId,
    connectorId: tx.connectorId,
    idTag: tx.idTag,
    status: tx.status,
    startTimestamp: tx.startTimestamp,
    stopTimestamp: tx.stopTimestamp,
    energyKwh: Number(((tx.energyWh ?? 0) / 1000).toFixed(3)),
    cost: tx.cost,
    lastPowerW: tx.lastPowerW,
    lastSocPercent: tx.lastSocPercent,
    stopReason: tx.stopReason ?? undefined,
  };
}

/**
 * Charging history for the tags linked to an account. The CSMS filters by a single
 * idTag per call, so multiple tags are fetched in parallel and merged.
 */
export async function listSessionsForIdTags(
  idTags: string[],
  limit = 50,
): Promise<ChargingSession[]> {
  if (idTags.length === 0) return [];

  const pages = await Promise.all(
    idTags.map((idTag) =>
      csmsFetch<Paginated<CsmsTransaction>>(
        `/transactions?idTag=${encodeURIComponent(idTag)}&limit=${limit}`,
      ).catch((err: unknown) => {
        console.warn(`[sessions] failed to load transactions for ${idTag}`, (err as Error).message);
        return { data: [] as CsmsTransaction[], total: 0, page: 1, limit };
      }),
    ),
  );

  return pages
    .flatMap((p) => p.data ?? [])
    .map(toSession)
    .sort((a, b) => b.startTimestamp.localeCompare(a.startTimestamp))
    .slice(0, limit);
}

/** Attaches station names to sessions so the history table is readable. */
export async function decorateSessions(sessions: ChargingSession[]): Promise<ChargingSession[]> {
  const ids = [...new Set(sessions.map((s) => s.chargePointId))];
  if (ids.length === 0) return sessions;

  const names = new Map<string, string>();
  await Promise.all(
    ids.map(async (id) => {
      const { station } = await getStation(id).catch(() => ({ station: null }));
      if (station) names.set(id, station.name);
    }),
  );

  return sessions.map((s) => ({ ...s, stationName: names.get(s.chargePointId) }));
}

export async function remoteStart(
  chargePointId: string,
  idTag: string,
  connectorId?: number,
): Promise<{ status: string }> {
  return csmsFetch<{ status: string }>(
    `/charge-points/${encodeURIComponent(chargePointId)}/remote-start`,
    { method: 'POST', body: { idTag, ...(connectorId ? { connectorId } : {}) } },
  );
}

export async function remoteStop(transactionId: number): Promise<{ status: string }> {
  return csmsFetch<{ status: string }>(`/transactions/${transactionId}/stop`, { method: 'POST' });
}

export async function getTransaction(id: number): Promise<ChargingSession | null> {
  try {
    const tx = await csmsFetch<CsmsTransaction>(`/transactions/${id}`);
    return toSession(tx);
  } catch {
    return null;
  }
}
