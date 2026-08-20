import { serverEnv } from '@/lib/env';

/**
 * Thin server-side client for the OCPP Central System REST API (../evChargerBack).
 *
 * The CSMS requires an operator credential on every route, so this module holds
 * the service credential and never exposes it to the browser: the web app talks
 * to its own /api routes, which call through to here.
 */

export class CsmsError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'CsmsError';
  }
}

/** Raised when the CSMS is unreachable, so callers can fall back to demo data. */
export class CsmsUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsmsUnavailableError';
  }
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

const globalForCsms = globalThis as unknown as { __evappCsmsToken?: TokenCache | null };

async function login(): Promise<string> {
  const email = serverEnv.csmsEmail();
  const password = serverEnv.csmsPassword();
  if (!email || !password) {
    throw new CsmsError(401, 'No CSMS credentials configured (set CSMS_API_KEY or CSMS_EMAIL/CSMS_PASSWORD)');
  }

  const res = await fetchWithTimeout(`${serverEnv.csmsBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new CsmsError(res.status, `CSMS login failed (${res.status})`);
  }

  const json = (await res.json()) as { token: string };
  // The CSMS default JWT lifetime is 12h; refresh well before that.
  globalForCsms.__evappCsmsToken = { token: json.token, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
  return json.token;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), serverEnv.csmsTimeoutMs());
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } catch (err) {
    const reason = (err as Error).name === 'AbortError' ? 'timed out' : (err as Error).message;
    throw new CsmsUnavailableError(`CSMS request failed: ${reason}`);
  } finally {
    clearTimeout(timer);
  }
}

async function authHeaders(forceLogin = false): Promise<Record<string, string>> {
  const apiKey = serverEnv.csmsApiKey();
  if (apiKey) return { 'x-api-key': apiKey };

  const cached = globalForCsms.__evappCsmsToken;
  if (!forceLogin && cached && cached.expiresAt > Date.now()) {
    return { Authorization: `Bearer ${cached.token}` };
  }
  return { Authorization: `Bearer ${await login()}` };
}

export interface CsmsRequestInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Seconds to cache the response; omitted means no caching. */
  revalidate?: number;
}

export async function csmsFetch<T>(path: string, init: CsmsRequestInit = {}): Promise<T> {
  const url = `${serverEnv.csmsBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const run = async (retry: boolean): Promise<Response> => {
    const headers: Record<string, string> = {
      ...(await authHeaders(retry)),
      ...((init.headers as Record<string, string>) ?? {}),
    };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';

    return fetchWithTimeout(url, {
      ...init,
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  };

  let res = await run(false);
  // A stale cached JWT looks like a 401; log in once and retry before giving up.
  if (res.status === 401 && !serverEnv.csmsApiKey()) {
    globalForCsms.__evappCsmsToken = null;
    res = await run(true);
  }

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string; details?: unknown };
    throw new CsmsError(res.status, payload.error ?? `CSMS returned ${res.status}`, payload.details);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function csmsHealth(): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetchWithTimeout(`${serverEnv.csmsBaseUrl()}/health`, { method: 'GET' });
    return { ok: res.ok, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: (err as Error).message };
  }
}
