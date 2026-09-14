import { guard, HOUR, json, parseBody, route } from '@/lib/api';
import { issuePhoneTicket } from '@/lib/auth/phone-ticket';
import { consumeSmsCode, invalidCode } from '@/lib/auth/sms-code';
import { getStore } from '@/lib/db';
import { phoneCodeSchema } from '@/lib/validation';

/** PIN reset, step 2: check the texted code and hand back a reset ticket. */
export const POST = route(async (req: Request) => {
  guard(req, 'auth:pin-verify', 20, HOUR);
  const { phone, code } = await parseBody(req, phoneCodeSchema);

  const store = await getStore();
  const user = await store.findUserByPhone(phone);
  if (!user || !user.isActive) throw invalidCode();

  if (!(await consumeSmsCode(store, user.id, 'password_reset', code))) throw invalidCode();

  return json({
    ok: true,
    // Pinned to the current tokenVersion, which the reset bumps, so the ticket
    // is spent the moment it is used.
    resetTicket: await issuePhoneTicket('pin_reset', { phone, v: user.tokenVersion ?? 0 }),
  });
});
