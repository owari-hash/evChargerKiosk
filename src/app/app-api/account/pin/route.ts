import { HOUR, badRequest, guard, json, notFound, parseBody, requireUser, route } from '@/lib/api';
import { clearedPinLock, hashPin, verifyPin } from '@/lib/auth/pin';
import { setSessionCookie, toPublicUser } from '@/lib/auth/session';
import { getStore } from '@/lib/db';
import { changePinSchema } from '@/lib/validation';

/** Changes the sign-in PIN, or sets the first one on an account that has none. */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  guard(req, `account-pin:${user.id}`, 10, HOUR);

  const body = await parseBody(req, changePinSchema);

  if (user.pinHash) {
    const matches = body.currentPin ? await verifyPin(body.currentPin, user.pinHash) : false;
    if (!matches) {
      throw badRequest('Тэмдэглэсэн талбаруудаа шалгана уу', {
        currentPin: 'Одоогийн PIN код буруу байна',
      });
    }
  }

  const store = await getStore();
  const updated = await store.updateUser(user.id, {
    pinHash: await hashPin(body.pin),
    ...clearedPinLock,
    tokenVersion: (user.tokenVersion ?? 0) + 1,
  });
  if (!updated) throw notFound('Таны бүртгэлийг олсонгүй');

  // Bumping tokenVersion invalidates every existing cookie; re-issuing one here
  // keeps this device signed in while other devices are signed out.
  await setSessionCookie(updated);

  return json({ ok: true, user: toPublicUser(updated) });
});
