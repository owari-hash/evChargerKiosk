import { cookies } from 'next/headers';
import { cache } from 'react';
import { serverEnv } from '@/lib/env';
import type {
  ChargingSession,
  PublicUser,
  Station,
  Wallet,
  WalletConfig,
  WalletEntry,
  TopUpInvoice,
  SavedCard,
} from '@/lib/types';

/**
 * Server-side reads from the driver API, which lives in evChargerBack.
 *
 * Pages call it over HTTP at API_ORIGIN (https://eplug.mn by default) and pass
 * along the visitor's own session cookie. This app holds no database, charging
 * network credential or signing secret of its own.
 *
 * Browser code does not use this module: it calls `/app-api/...` on the page's
 * own origin, which nginx routes to evChargerBack (and `app/app-api/[...path]`
 * forwards when running locally).
 */

export class DriverApiError extends Error {
  constructor(
    /** 0 when the API could not be reached at all. */
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DriverApiError';
  }
}

async function sessionCookie(): Promise<string | undefined> {
  const name = serverEnv.sessionCookieName();
  const token = (await cookies()).get(name)?.value;
  return token ? `${name}=${token}` : undefined;
}

async function driverApi<T>(path: string): Promise<T> {
  const cookie = await sessionCookie();

  let res: Response;
  try {
    res = await fetch(`${serverEnv.apiOrigin()}/app-api${path}`, {
      headers: { accept: 'application/json', ...(cookie ? { cookie } : {}) },
      cache: 'no-store',
      signal: AbortSignal.timeout(serverEnv.apiTimeoutMs()),
    });
  } catch (err) {
    throw new DriverApiError(0, `Driver API unreachable: ${(err as Error).message}`);
  }

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new DriverApiError(res.status, body.error ?? `Driver API returned ${res.status}`);
  }
  return body as T;
}

/** The signed-in driver, or null. Deduplicated across one render. */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
  if (!(await sessionCookie())) return null;
  try {
    return (await driverApi<{ user: PublicUser }>('/auth/me')).user;
  } catch (err) {
    // An expired cookie is a signed-out visitor; anything else is worth a log,
    // but still must not take the page down.
    if ((err as DriverApiError).status !== 401) console.error('[session] auth/me failed', err);
    return null;
  }
});

export interface StationQuery {
  search?: string;
  status?: 'all' | 'available' | 'busy' | 'offline';
  connectorType?: string;
  minPowerKw?: number;
  lat?: number;
  lng?: number;
  limit?: number;
}

export interface StationResult {
  stations: Station[];
  demo: boolean;
  warning?: string;
}

export function listStations(query: StationQuery = {}): Promise<StationResult> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return driverApi<StationResult>(`/stations${qs ? `?${qs}` : ''}`);
}

export interface StationLoad {
  station: Station | null;
  remoteStartEnabled: boolean;
}

/** A station by either identifier; `station` is null for one that does not exist. */
export async function getStation(id: string): Promise<StationLoad> {
  try {
    return await driverApi<StationLoad>(`/stations/${encodeURIComponent(id)}`);
  } catch (err) {
    if ((err as DriverApiError).status === 404) return { station: null, remoteStartEnabled: false };
    throw err;
  }
}

export interface WalletLoad {
  wallet: Wallet;
  config: WalletConfig;
  entries: WalletEntry[];
  total: number;
  /** Saved bank cards; absent from older APIs. */
  cards?: SavedCard[];
}

/** The signed-in driver's wallet with its newest `limit` ledger entries (max 100). */
export function getWallet(limit: number): Promise<WalletLoad> {
  return driverApi<WalletLoad>(`/wallet?limit=${limit}`);
}

export interface TopUpLoad {
  invoice: TopUpInvoice;
  paid: boolean;
  wallet: Wallet | null;
}

/**
 * One of the driver's own top-ups, re-checked with the bank. Null when it is
 * unknown or someone else's, so a tampered `?topup=` just shows the plain page.
 */
export async function getTopUp(id: string): Promise<TopUpLoad | null> {
  try {
    return await driverApi<TopUpLoad>(`/wallet/topup/${encodeURIComponent(id)}`);
  } catch {
    return null;
  }
}

/** The signed-in driver's charging sessions, newest first. */
export async function listSessions(limit: number): Promise<ChargingSession[]> {
  return (await driverApi<{ sessions: ChargingSession[] }>(`/sessions?limit=${limit}`)).sessions;
}

/** A connector resolved from the short code printed on its QR sticker. */
export interface ConnectorCodeLoad {
  code: string;
  stationId: string;
  cpId: string;
  stationName: string;
  address: string | null;
  connectorId: number;
  connectorType: string | null;
  powerKw: number | null;
  label: string | null;
}

/**
 * Resolves a sticker code. Null means the code is not one of ours; a thrown
 * error means the API could not be asked, which the page reports differently —
 * a driver standing at a charger needs to know which of the two happened.
 */
export async function resolveConnectorCode(code: string): Promise<ConnectorCodeLoad | null> {
  try {
    return await driverApi<ConnectorCodeLoad>(`/app/connector/${encodeURIComponent(code)}`);
  } catch (err) {
    if ((err as DriverApiError).status === 404) return null;
    throw err;
  }
}
