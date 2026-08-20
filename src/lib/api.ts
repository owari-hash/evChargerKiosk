import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { clientIp, rateLimit } from '@/lib/auth/rate-limit';
import { CsmsError, CsmsUnavailableError } from '@/lib/csms/client';
import { fieldErrors } from '@/lib/validation';
import type { StoredUser } from '@/lib/db/types';

/**
 * Shared plumbing for the route handlers so every endpoint returns the same
 * error envelope: `{ error: string, fields?: Record<string,string> }`.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const unauthorized = (message = 'Please sign in to continue') => new ApiError(401, message);
export const forbidden = (message = 'You do not have access to this') => new ApiError(403, message);
export const notFound = (message = 'Not found') => new ApiError(404, message);
export const badRequest = (message: string, fields?: Record<string, string>) =>
  new ApiError(400, message, fields);
export const conflict = (message: string, fields?: Record<string, string>) =>
  new ApiError(409, message, fields);
export const tooMany = (message = 'Too many requests, please try again later') =>
  new ApiError(429, message);

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** Wraps a handler so thrown errors become consistent JSON responses. */
export function route<Req extends Request, Args extends unknown[]>(
  handler: (req: Req, ...args: Args) => Promise<NextResponse>,
) {
  return async (req: Req, ...args: Args): Promise<NextResponse> => {
    try {
      return await handler(req, ...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: err.message, ...(err.fields ? { fields: err.fields } : {}) },
          { status: err.status },
        );
      }
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Please check the highlighted fields', fields: fieldErrors(err) },
          { status: 400 },
        );
      }
      if (err instanceof CsmsUnavailableError) {
        return NextResponse.json(
          { error: 'The charging network is not reachable right now. Please try again shortly.' },
          { status: 503 },
        );
      }
      if (err instanceof CsmsError) {
        return NextResponse.json({ error: err.message }, { status: err.status === 401 ? 502 : err.status });
      }
      console.error('[api] unhandled error', err);
      return NextResponse.json({ error: 'Something went wrong on our side' }, { status: 500 });
    }
  };
}

/** Parses a JSON body against a schema, turning failures into a 400 with field errors. */
export async function parseBody<S extends z.ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest('Expected a JSON request body');
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(400, 'Please check the highlighted fields', fieldErrors(result.error));
  }
  return result.data;
}

export function parseQuery<S extends z.ZodTypeAny>(req: Request, schema: S): z.infer<S> {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) {
    throw new ApiError(400, 'Invalid query parameters', fieldErrors(result.error));
  }
  return result.data;
}

export async function requireUser(): Promise<StoredUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

/** Throws 429 when the caller exceeds `limit` requests per `windowMs` for `scope`. */
export function guard(req: Request, scope: string, limit: number, windowMs: number): void {
  const result = rateLimit(`${scope}:${clientIp(req)}`, limit, windowMs);
  if (!result.ok) {
    throw tooMany(`Too many attempts. Try again in ${result.retryAfterSeconds}s.`);
  }
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
