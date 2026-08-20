import { randomBytes } from 'node:crypto';
import { guard, json, MINUTE, parseBody, route, unauthorized } from '@/lib/api';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { setSessionCookie, toPublicUser } from '@/lib/auth/session';
import { getStore } from '@/lib/db';
import { loginSchema } from '@/lib/validation';

const GENERIC = 'И-мэйл эсвэл нууц үг буруу байна';

/**
 * Compared against when no account matches, so an unknown email costs the same
 * bcrypt work as a wrong password and cannot be probed by timing.
 */
let dummy: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  dummy ??= hashPassword(randomBytes(24).toString('base64url'));
  return dummy;
}

export const POST = route(async (req: Request) => {
  guard(req, 'auth:login', 10, 15 * MINUTE);
  const { email, password } = await parseBody(req, loginSchema);

  const store = await getStore();
  const user = await store.findUserByEmail(email);
  const matches = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));

  // Inactive accounts get the same wording so the endpoint reveals nothing.
  if (!user || !matches || !user.isActive) throw unauthorized(GENERIC);

  const updated =
    (await store.updateUser(user.id, { lastLoginAt: new Date().toISOString() })) ?? user;

  // `remember` is accepted for forward compatibility; cookie lifetime is fixed by
  // SESSION_MAX_AGE_DAYS for every session.
  await setSessionCookie(updated);

  return json({ user: toPublicUser(updated) });
});
