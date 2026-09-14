import { guard, HOUR, json, notFound, parseBody, route } from '@/lib/api';
import { clearedPinLock, hashPin } from '@/lib/auth/pin';
import { readPhoneTicket } from '@/lib/auth/phone-ticket';
import { setSessionCookie, toPublicUser } from '@/lib/auth/session';
import { expiredTicket } from '@/lib/auth/sms-code';
import { getStore } from '@/lib/db';
import { pinResetSchema } from '@/lib/validation';

/**
 * PIN reset, step 3: store the new PIN, unlock the account, sign out every other
 * device and sign this one in.
 */
export const POST = route(async (req: Request) => {
  guard(req, 'auth:pin-reset', 10, HOUR);
  const body = await parseBody(req, pinResetSchema);

  const ticket = await readPhoneTicket('pin_reset', body.resetTicket);
  if (!ticket) throw expiredTicket();

  const store = await getStore();
  const user = await store.findUserByPhone(ticket.phone);
  if (!user || !user.isActive || (user.tokenVersion ?? 0) !== ticket.v) throw expiredTicket();

  const updated = await store.updateUser(user.id, {
    pinHash: await hashPin(body.pin),
    ...clearedPinLock,
    tokenVersion: (user.tokenVersion ?? 0) + 1,
    // Receiving the code proved the number, even on an account from before.
    phoneVerifiedAt: user.phoneVerifiedAt ?? new Date().toISOString(),
  });
  if (!updated) throw notFound('Таны бүртгэлийг олсонгүй');

  await setSessionCookie(updated);

  return json({ user: toPublicUser(updated) });
});
