import { NextResponse, type NextRequest } from 'next/server';
import { hasValidSessionSignature } from '@/lib/auth/edge-session';
import { serverEnv } from '@/lib/env';

/** Signed-in-only areas. Everything else (station browsing) stays public. */
const PROTECTED = ['/account'];
/** Pages that make no sense once you are already signed in. */
const GUEST_ONLY = ['/login', '/register', '/forgot-password'];

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

  if (GUEST_ONLY.includes(pathname) && signedIn) {
    const url = req.nextUrl.clone();
    url.pathname = '/account';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/login', '/register', '/forgot-password'],
};
