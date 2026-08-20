import { HOUR, badRequest, guard, json, notFound, parseBody, requireUser, route } from '@/lib/api';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { setSessionCookie } from '@/lib/auth/session';
import { getStore } from '@/lib/db';
import { changePasswordSchema } from '@/lib/validation';

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  guard(req, `account-password:${user.id}`, 10, HOUR);

  const body = await parseBody(req, changePasswordSchema);

  const matches = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!matches) {
    throw badRequest('Please check the highlighted fields', {
      currentPassword: 'That password is not correct',
    });
  }

  const store = await getStore();
  const updated = await store.updateUser(user.id, {
    passwordHash: await hashPassword(body.password),
    tokenVersion: (user.tokenVersion ?? 0) + 1,
  });
  if (!updated) throw notFound('We could not find your account');

  // Bumping tokenVersion invalidates every existing cookie; re-issuing one here
  // keeps this device signed in while other devices are signed out.
  await setSessionCookie(updated);

  return json({ ok: true });
});
