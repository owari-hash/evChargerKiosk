import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/lib/env';

/** Signed-in-only areas. Everything else (station browsing) stays public. */
const PROTECTED = ['/account'];

/**
 * An optimistic check only: is there a session cookie at all. The signing secret
 * lives with the driver API in evChargerBack, so the cookie cannot be verified
 * here — the account pages ask `auth/me` and redirect when it says no.
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(serverEnv.sessionCookieName())?.value);

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*'],
};
