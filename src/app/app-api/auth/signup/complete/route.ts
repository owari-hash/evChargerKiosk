import { guard, HOUR, json, parseBody, route } from '@/lib/api';
import { hashPin } from '@/lib/auth/pin';
import { readPhoneTicket } from '@/lib/auth/phone-ticket';
import { setSessionCookie, toPublicUser } from '@/lib/auth/session';
import { expiredTicket, phoneTaken } from '@/lib/auth/sms-code';
import { ensureChargeTag } from '@/lib/csms/charge-tag';
import { getStore } from '@/lib/db';
import type { StoredUser } from '@/lib/db/types';
import { signupCompleteSchema } from '@/lib/validation';

/** Sign-up, step 3: create the account with its PIN and sign the driver in. */
export const POST = route(async (req: Request) => {
  guard(req, 'auth:signup-complete', 10, HOUR);
  const body = await parseBody(req, signupCompleteSchema);

  const ticket = await readPhoneTicket('signup', body.signupTicket);
  if (!ticket) throw expiredTicket();

  const store = await getStore();
  if (await store.findUserByPhone(ticket.phone)) throw phoneTaken();

  let user: StoredUser;
  try {
    user = await store.createUser({
      phone: ticket.phone,
      // The ticket is the proof: it is only issued for a code that came back.
      phoneVerifiedAt: new Date().toISOString(),
      pinHash: await hashPin(body.pin),
    });
  } catch (err) {
    // Two requests with the same ticket racing past the check above.
    if ((err as { code?: number }).code === 11000) throw phoneTaken();
    throw err;
  }

  // Every account gets its charge tag immediately, so a driver can charge
  // without ever being asked to know what a tag is. A CSMS that is down here
  // does not block sign-up; the tag is issued on the next visit instead.
  const idTag = await ensureChargeTag(user);
  if (idTag) user = { ...user, idTag };

  await setSessionCookie(user);

  return json({ user: toPublicUser(user) });
});
