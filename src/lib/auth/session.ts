import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { requireSessionSecret, serverEnv, isProduction } from '@/lib/env';
import { getStore } from '@/lib/db';
import type { StoredUser } from '@/lib/db/types';
import type { PublicUser } from '@/lib/types';

export interface SessionClaims {
  sub: string;
  email: string;
  /** Must match the user's current tokenVersion, so a password reset logs out old devices. */
  v: number;
}

function key(): Uint8Array {
  return new TextEncoder().encode(requireSessionSecret());
}

export async function createSessionToken(user: StoredUser): Promise<string> {
  const days = serverEnv.sessionMaxAgeDays();
  return new SignJWT({ email: user.email, v: user.tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(key());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ''),
      v: Number(payload.v ?? 0),
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: StoredUser): Promise<void> {
  const token = await createSessionToken(user);
  const jar = await cookies();
  jar.set(serverEnv.sessionCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: serverEnv.sessionMaxAgeDays() * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(serverEnv.sessionCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
    maxAge: 0,
  });
}

/** Resolves the signed-in account, or null. Safe to call from any server context. */
export async function getCurrentUser(): Promise<StoredUser | null> {
  const jar = await cookies();
  const token = jar.get(serverEnv.sessionCookieName())?.value;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  try {
    const store = await getStore();
    const user = await store.findUserById(claims.sub);
    if (!user || !user.isActive) return null;
    if ((user.tokenVersion ?? 0) !== claims.v) return null;
    return user;
  } catch (err) {
    console.error('[session] failed to load user', err);
    return null;
  }
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    emailVerified: Boolean(user.emailVerifiedAt),
    phoneVerified: Boolean(user.phoneVerifiedAt),
    idTags: user.idTags ?? [],
    locale: user.locale ?? 'en',
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}
