import type {
  ConnectorStatus,
  ConnectorType,
  Station,
  StationAvailability,
  StationConnector,
} from '@/lib/types';
import { CONNECTOR_TYPES } from '@/lib/types';

/** Raw shapes returned by the CSMS REST API. */
export interface CsmsConnector {
  connectorId: number;
  status?: string;
  errorCode?: string;
  availability?: string;
  currentTransactionId?: number | null;
  lastPowerW?: number;
  lastSocPercent?: number;
  statusTimestamp?: string;
}

export interface CsmsChargePoint {
  id?: string;
  _id?: string;
  /** The OCPP identifier; `id` is the CSMS's own stable identifier. */
  cpId?: string;
  name?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  tariffPerKwh?: number;
  chargePointVendor?: string;
  chargePointModel?: string;
  tags?: string[];
  isOnline?: boolean;
  lastSeenAt?: string;
  connectors?: CsmsConnector[];
}

/**
 * The CSMS stores no plug metadata, so the driver-facing plug type and power are
 * read from the charge point's free-form `tags` (e.g. `ccs2`, `type2`, `60kw`).
 * Tag a connector explicitly with `c2:ccs2` / `c2:60kw` to target connector 2.
 * Extend this when the backend gains real connector fields.
 */
const TYPE_ALIASES: Record<string, ConnectorType> = {
  type2: 'Type2',
  mennekes: 'Type2',
  iec62196: 'Type2',
  ccs: 'CCS2',
  ccs2: 'CCS2',
  combo2: 'CCS2',
  chademo: 'CHAdeMO',
  gbt: 'GBT',
  'gb/t': 'GBT',
  type1: 'Type1',
  j1772: 'Type1',
  schuko: 'Schuko',
};

interface TagInfo {
  types: ConnectorType[];
  powerKw?: number;
  perConnector: Map<number, { type?: ConnectorType; powerKw?: number }>;
}

function parseTags(tags: string[]): TagInfo {
  const info: TagInfo = { types: [], perConnector: new Map() };

  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (!tag) continue;

    const scoped = /^c(\d+):(.+)$/.exec(tag);
    const value = scoped ? scoped[2]! : tag;
    const connectorId = scoped ? Number(scoped[1]) : undefined;

    const type = TYPE_ALIASES[value];
    const power = /^(\d+(?:\.\d+)?)\s*kw$/.exec(value);

    if (connectorId !== undefined) {
      const entry = info.perConnector.get(connectorId) ?? {};
      if (type) entry.type = type;
      if (power) entry.powerKw = Number(power[1]);
      info.perConnector.set(connectorId, entry);
      if (type && !info.types.includes(type)) info.types.push(type);
      continue;
    }

    if (type && !info.types.includes(type)) info.types.push(type);
    if (power) info.powerKw = Math.max(info.powerKw ?? 0, Number(power[1]));
  }

  return info;
}

function isConnectorStatus(value: string): value is ConnectorStatus {
  return [
    'Available',
    'Preparing',
    'Charging',
    'SuspendedEV',
    'SuspendedEVSE',
    'Finishing',
    'Reserved',
    'Unavailable',
    'Faulted',
  ].includes(value);
}

export function toStation(cp: CsmsChargePoint): Station {
  const id = cp.id ?? cp._id ?? '';
  const tags = cp.tags ?? [];
  const tagInfo = parseTags(tags);
  const isOnline = cp.isOnline === true;

  // connectorId 0 addresses the charge point as a whole, not a physical socket.
  const connectors: StationConnector[] = (cp.connectors ?? [])
    .filter((c) => c.connectorId > 0)
    .sort((a, b) => a.connectorId - b.connectorId)
    .map((c) => {
      const scoped = tagInfo.perConnector.get(c.connectorId);
      const rawStatus = c.status ?? 'Unavailable';
      return {
        connectorId: c.connectorId,
        // An offline station cannot report a live status; show it as unavailable.
        status: isOnline && isConnectorStatus(rawStatus) ? rawStatus : 'Unavailable',
        errorCode: c.errorCode ?? 'NoError',
        availability: c.availability === 'Inoperative' ? 'Inoperative' : 'Operative',
        type: scoped?.type ?? tagInfo.types[0],
        powerKw: scoped?.powerKw ?? tagInfo.powerKw,
        currentTransactionId: c.currentTransactionId ?? null,
        lastPowerW: c.lastPowerW,
        lastSocPercent: c.lastSocPercent,
        statusTimestamp: c.statusTimestamp,
      };
    });

  const availableConnectors = connectors.filter(
    (c) => c.status === 'Available' && c.availability === 'Operative',
  ).length;

  let availability: StationAvailability;
  if (!isOnline) availability = 'offline';
  else if (connectors.length === 0) availability = 'unknown';
  else availability = availableConnectors > 0 ? 'available' : 'busy';

  const connectorTypes = [
    ...new Set(connectors.map((c) => c.type).filter((t): t is ConnectorType => Boolean(t))),
  ].sort((a, b) => CONNECTOR_TYPES.indexOf(a) - CONNECTOR_TYPES.indexOf(b));

  const powers = connectors.map((c) => c.powerKw).filter((p): p is number => typeof p === 'number');

  return {
    id,
    cpId: cp.cpId,
    // Falling back to the OCPP identifier rather than the internal id keeps an
    // unnamed station readable instead of showing a hex string to drivers.
    name: cp.name?.trim() || cp.cpId || id,
    description: cp.description,
    address: cp.address,
    latitude: cp.latitude,
    longitude: cp.longitude,
    tariffPerKwh: cp.tariffPerKwh,
    vendor: cp.chargePointVendor,
    model: cp.chargePointModel,
    tags,
    isOnline,
    lastSeenAt: cp.lastSeenAt,
    connectors,
    totalConnectors: connectors.length,
    availableConnectors,
    maxPowerKw: powers.length ? Math.max(...powers) : tagInfo.powerKw,
    connectorTypes,
    availability,
  };
}
