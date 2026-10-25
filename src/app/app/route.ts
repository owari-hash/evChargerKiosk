import { NextRequest, NextResponse } from 'next/server';
import { appLinks } from '@/lib/app-links';

export const dynamic = 'force-dynamic';

/**
 * Dynamic app store redirector for the universal download QR code and download CTA.
 *
 * Checks User-Agent -> immediately redirects to actual store:
 *   - iOS (iPhone / iPad / iPod) -> Apple App Store
 *   - macOS -> Apple App Store
 *   - Android / other (Windows, Linux, etc.) -> Google Play Store
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const ua = request.headers.get('user-agent') || '';

  // Detect iOS (iPhone, iPad, iPod, or iPadOS desktop mode)
  const isIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && /Mobile/i.test(ua));

  const isMac = /Macintosh|Mac OS X/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // Directly link to actual stores without looping back to web page
  const targetUrl = isIos || isMac ? appLinks.ios : appLinks.android;

  return NextResponse.redirect(targetUrl, {
    status: 307,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
