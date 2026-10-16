// TEMP-MOCK: dev-only screenshot fixtures. Delete this file before committing.
import type { ChargingSession, PublicUser, Station, StationConnector } from '@/lib/types';

export type MockMode = 'user' | 'free' | 'busy2' | 'charging' | 'done' | 'notag';

export function mockMode(cookieHeader: string | null | undefined): MockMode | null {
  if (process.env.NODE_ENV !== 'development' || !cookieHeader) return null;
  const m = /(?:^|;\s*)__mock=([a-z0-9]+)/.exec(cookieHeader);
  return (m?.[1] as MockMode) ?? null;
}

export function mockUser(mode: MockMode): PublicUser {
  return {
    id: 'mock',
    phone: '99112233',
    name: 'Mock Driver',
    emailVerified: false,
    phoneVerified: true,
    hasPin: true,
    idTag: mode === 'notag' ? undefined : 'EVK7QM4XRT9C',
    locale: 'mn',
    createdAt: new Date().toISOString(),
    pendingGuides: [],
  };
}

function patchConnectors(mode: MockMode, connectors: StationConnector[]): StationConnector[] {
  if (mode === 'user' || mode === 'notag') return connectors;
  return connectors.map((c, i) => {
    const base = { ...c, availability: 'Operative' as const, errorCode: 'NoError', currentTransactionId: null };
    if ((mode === 'charging' && i === 0) || (mode === 'busy2' && i === 1)) {
      return { ...base, status: 'Charging' as const, currentTransactionId: 4242, lastPowerW: 48200, lastSocPercent: 63 };
    }
    if (mode === 'free' && i === 0) return { ...base, status: 'Preparing' as const };
    return { ...base, status: 'Available' as const };
  });
}

export function mockStation(mode: MockMode, station: Station): Station {
  if (mode === 'user' || mode === 'notag') return station;
  const connectors = patchConnectors(mode, station.connectors);
  return { ...station, connectors, isOnline: true, availability: 'available', feePercent: 5 };
}

function mockSession(mode: MockMode): ChargingSession | null {
  if (mode !== 'charging' && mode !== 'done') return null;
  const start = new Date(Date.now() - 23 * 60_000).toISOString();
  return {
    transactionId: 4242,
    chargePointId: 'Baganuur',
    connectorId: 1,
    idTag: 'EVK7QM4XRT9C',
    status: mode === 'charging' ? 'Active' : 'Completed',
    startTimestamp: start,
    stopTimestamp: mode === 'done' ? new Date().toISOString() : undefined,
    energyKwh: 18.4,
    cost: mode === 'done' ? 19320 : undefined,
    energyCost: mode === 'done' ? 18400 : undefined,
    feeAmount: mode === 'done' ? 920 : undefined,
    feePercent: 5,
    lastPowerW: 48200,
    lastSocPercent: 63,
  };
}

export function mockLive(mode: MockMode, live: Record<string, unknown>): Record<string, unknown> {
  if (mode === 'user' || mode === 'notag') return live;
  const connectors = patchConnectors(mode, (live.connectors as StationConnector[]) ?? []);
  return { ...live, connectors, availability: 'available', session: mockSession(mode) };
}
