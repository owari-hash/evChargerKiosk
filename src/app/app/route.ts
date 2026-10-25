import { NextRequest, NextResponse } from 'next/server';
import { appLinks } from '@/lib/app-links';

export const dynamic = 'force-dynamic';

/**
 * Dynamic app store redirector for the universal download QR code.
 *
 * Scanned by a phone camera -> checks User-Agent -> immediately redirects:
 *   - iOS (iPhone / iPad / iPod) -> Apple App Store
 *   - Android -> Google Play Store
 *   - Desktop / other -> /download page
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const ua = request.headers.get('user-agent') || '';

  // Detect iOS (iPhone, iPad, iPod, or iPadOS desktop mode)
  const isIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && typeof navigator !== 'undefined' && (navigator as any)?.maxTouchPoints > 1) ||
    (/Macintosh/i.test(ua) && /Mobile/i.test(ua));

  // Detect Android
  const isAndroid = /Android/i.test(ua);

  const targetUrl = isIos
    ? appLinks.ios
    : isAndroid
      ? appLinks.android
      : new URL('/download', request.url).toString();

  return NextResponse.redirect(targetUrl, {
    status: 307,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
