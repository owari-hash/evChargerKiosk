import { NextResponse, type NextRequest } from 'next/server';
import { hasValidSessionSignature } from '@/lib/auth/edge-session';
import { serverEnv } from '@/lib/env';

/** Signed-in-only areas. Everything else (station browsing) stays public. */
const PROTECTED = ['/account'];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(serverEnv.sessionCookieName())?.value;
  const signedIn = await hasValidSessionSignature(token);

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !signedIn) {
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

