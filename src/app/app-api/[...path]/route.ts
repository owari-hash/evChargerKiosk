import { NextResponse, type NextRequest } from 'next/server';
import { serverEnv } from '@/lib/env';

/**
 * Pass-through to the driver API in evChargerBack.
 *
 * On eplug.mn nginx sends `/app-api/*` straight to evChargerBack, so this never
 * runs there. It is what makes `next dev` (and any host without that nginx rule)
 * work: browser code keeps calling `/app-api/...` on its own origin, so it needs
 * no CORS grant, and the session cookie is relayed in both directions.
 */

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ path: string[] }> };

/**
 * Marks a request this handler forwarded. Seeing it come back means API_ORIGIN
 * routed `/app-api` to this app again — without the guard that loops forever.
 */
const FORWARDED_MARK = 'x-eplug-kiosk-forwarded';

const FORWARDED_HEADERS = ['accept', 'accept-language', 'content-type', 'cookie', 'user-agent'];

async function handler(req: NextRequest, ctx: Ctx): Promise<Response> {
  if (req.headers.get(FORWARDED_MARK)) {
    return NextResponse.json(
      { error: 'API_ORIGIN points back at the web app; route /app-api/ to evChargerBack' },
      { status: 508 },
    );
  }

  const { path } = await ctx.params;
  if (!path?.length || path.some((s) => s === '..' || s === '.')) {
    return NextResponse.json({ error: 'Хүсэлт олдсонгүй' }, { status: 404 });
  }

  const target = new URL(
    `${serverEnv.apiOrigin()}/app-api/${path.map(encodeURIComponent).join('/')}`,
  );
  target.search = req.nextUrl.search;

  const headers = new Headers({ [FORWARDED_MARK]: '1' });
  for (const name of FORWARDED_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(serverEnv.apiTimeoutMs()),
    });
  } catch {
    return NextResponse.json(
      { error: 'Сервертэй холбогдож чадсангүй. Холболтоо шалгаад дахин оролдоно уу.' },
      { status: 502 },
    );
  }

  const out = new Headers({
    'content-type': upstream.headers.get('content-type') ?? 'application/json',
    'cache-control': 'no-store',
  });
  // The API marks its cookie Secure in production; over plain http (next dev)
  // some browsers would drop it, so the flag is removed on that hop only.
  const plainHttp = req.nextUrl.protocol === 'http:';
  for (const cookie of upstream.headers.getSetCookie()) {
    out.append('set-cookie', plainHttp ? cookie.replace(/;\s*secure/gi, '') : cookie);
  }

  // 204 and friends must not carry a body.
  if (upstream.status === 204 || upstream.status === 205 || upstream.status === 304) {
    return new Response(null, { status: upstream.status, headers: out });
  }
  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: out });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
