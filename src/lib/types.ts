/** Shared domain types for the driver-facing web app. */

export const CONNECTOR_STATUSES = [
  'Available',
  'Preparing',
  'Charging',
  'SuspendedEV',
  'SuspendedEVSE',
  'Finishing',
  'Reserved',
  'Unavailable',
  'Faulted',
] as const;

export type ConnectorStatus = (typeof CONNECTOR_STATUSES)[number];

/** Physical plug standards we can present in the UI. */
export const CONNECTOR_TYPES = ['Type2', 'CCS2', 'CHAdeMO', 'GBT', 'Type1', 'Schuko'] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export type StationAvailability = 'available' | 'busy' | 'offline' | 'unknown';

export interface StationConnector {
  connectorId: number;
  status: ConnectorStatus;
  errorCode: string;
  availability: 'Operative' | 'Inoperative';
  type?: ConnectorType;
  powerKw?: number;
  currentTransactionId: number | null;
  lastPowerW?: number;
  lastSocPercent?: number;
  statusTimestamp?: string;
}

export interface Station {
  id: string;
  name: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  tariffPerKwh?: number;
  vendor?: string;
  model?: string;
  tags: string[];
  isOnline: boolean;
  lastSeenAt?: string;
  connectors: StationConnector[];
  /** Derived summary fields, computed server-side so lists stay cheap. */
  totalConnectors: number;
  availableConnectors: number;
  maxPowerKw?: number;
  connectorTypes: ConnectorType[];
  availability: StationAvailability;
  /** Kilometres from the requested origin, when the query supplied one. */
  distanceKm?: number;
}

export interface ChargingSession {
  transactionId: number;
  chargePointId: string;
  stationName?: string;
  connectorId: number;
  idTag: string;
  status: 'Active' | 'Completed' | 'Rejected';
  startTimestamp: string;
  stopTimestamp?: string;
  energyKwh: number;
  cost?: number;
  lastPowerW?: number;
  lastSocPercent?: number;
  stopReason?: string;
}

export interface PublicUser {
  id: string;
  email: string;
  phone?: string;
  name?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  idTags: string[];
  locale: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
