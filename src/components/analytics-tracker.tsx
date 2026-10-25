'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function TrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = React.useRef<string>('');

  React.useEffect(() => {
    if (!pathname) return;
    const fullPath = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    if (fullPath === lastPathRef.current) return;
    lastPathRef.current = fullPath;

    try {
      const payload = JSON.stringify({
        path: fullPath,
        referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
        platform: 'web',
      });

      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/app-api/app/analytics', payload);
      } else {
        fetch('/app-api/app/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Ignore analytics network errors
    }
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <React.Suspense fallback={null}>
      <TrackerInner />
    </React.Suspense>
  );
}
